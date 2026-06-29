import { useEffect, useMemo, useState } from 'react';
import {
  OXONO_SIZE,
  placementCells,
  totemDestinations,
  winningLine,
  type OxonoView,
  type OxSymbol,
} from '@boardhub/engine';

const N = OXONO_SIZE;
const CELL = 56;
const BOARD = N * CELL;

const COLOR_VAR: Record<string, string> = {
  pink: 'var(--bh-pink)',
  black: 'var(--bh-black)',
};

interface OxonoAction {
  totem: OxSymbol;
  to: number;
  place: number;
}

interface Props {
  view: OxonoView;
  interactive: boolean;
  yourSeat: number | null;
  onAction: (action: OxonoAction) => void;
}

function center(index: number): { cx: number; cy: number; row: number; col: number } {
  const row = Math.floor(index / N);
  const col = index % N;
  return { cx: col * CELL + CELL / 2, cy: row * CELL + CELL / 2, row, col };
}

function Token({ symbol, color, cx, cy }: { symbol: OxSymbol; color: string; cx: number; cy: number }) {
  const stroke = COLOR_VAR[color] ?? 'var(--bh-ink)';
  if (symbol === 'O') {
    return <circle cx={cx} cy={cy} r={CELL * 0.3} fill="none" stroke={stroke} strokeWidth={6} />;
  }
  const d = CELL * 0.26;
  return (
    <g stroke={stroke} strokeWidth={6} strokeLinecap="round">
      <line x1={cx - d} y1={cy - d} x2={cx + d} y2={cy + d} />
      <line x1={cx - d} y1={cy + d} x2={cx + d} y2={cy - d} />
    </g>
  );
}

function Totem({ symbol, cx, cy, selected }: { symbol: OxSymbol; cx: number; cy: number; selected: boolean }) {
  const s = CELL * 0.74;
  return (
    <g>
      <rect
        x={cx - s / 2}
        y={cy - s / 2}
        width={s}
        height={s}
        rx={8}
        fill="#8a8f98"
        stroke={selected ? 'var(--bh-accent)' : '#6f747c'}
        strokeWidth={selected ? 4 : 2}
      />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central" fontSize={CELL * 0.4} fontWeight={750} fill="#ffffff">
        {symbol}
      </text>
    </g>
  );
}

export function OxonoBoard({ view, interactive, yourSeat, onAction }: Props) {
  const [totem, setTotem] = useState<OxSymbol | null>(null);
  const [dest, setDest] = useState<number | null>(null);

  const myTurn =
    interactive && yourSeat !== null && view.toMove === yourSeat && view.winner === null && !view.draw;

  useEffect(() => {
    setTotem(null);
    setDest(null);
  }, [view.moveCount, myTurn]);

  const dests = useMemo(() => (totem ? totemDestinations(view, totem).dests : []), [view, totem]);
  const places = useMemo(
    () => (totem !== null && dest !== null ? placementCells(view, totem, dest) : []),
    [view, totem, dest],
  );

  const winLine = useMemo(
    () => (view.winner !== null && view.last ? winningLine(view, view.last.place) : null),
    [view],
  );

  const reserveOk = (sym: OxSymbol): boolean =>
    yourSeat !== null ? view.reserves[yourSeat][sym] > 0 : false;

  const totemCell = (sym: OxSymbol): number =>
    totem === sym && dest !== null ? dest : view.totem[sym];

  function handleCell(index: number): void {
    if (!myTurn) return;

    // Placement phase: a destination is chosen and the totem is previewed there.
    if (totem && dest !== null) {
      // Click the previewed totem to cancel the move and pick a destination again.
      if (index === dest) {
        setDest(null);
        return;
      }
      // Place on any highlighted cell, including the totem's now vacated origin cell.
      if (places.includes(index)) {
        onAction({ totem, to: dest, place: index });
        setTotem(null);
        setDest(null);
        return;
      }
      // Choose a different destination for the same totem.
      if (dests.includes(index)) {
        setDest(index);
        return;
      }
      // Switch to the other totem.
      if (view.totem.X === index && reserveOk('X')) {
        setTotem('X');
        setDest(null);
        return;
      }
      if (view.totem.O === index && reserveOk('O')) {
        setTotem('O');
        setDest(null);
        return;
      }
      return;
    }

    // Selection phase: pick or toggle a totem, then pick a destination.
    if (view.totem.X === index && reserveOk('X')) {
      setTotem(totem === 'X' ? null : 'X');
      setDest(null);
      return;
    }
    if (view.totem.O === index && reserveOk('O')) {
      setTotem(totem === 'O' ? null : 'O');
      setDest(null);
      return;
    }
    if (totem && dests.includes(index)) {
      setDest(index);
    }
  }

  const highlightDest = new Set(totem && dest === null ? dests : []);
  const highlightPlace = new Set(dest !== null ? places : []);

  return (
    <div className="bh-oxono">
      <svg viewBox={`-2 -2 ${BOARD + 4} ${BOARD + 4}`} width="100%" role="img" aria-label="Bàn cờ Oxono">
        {/* cells */}
        {Array.from({ length: N * N }, (_, i) => {
          const { row, col } = center(i);
          return (
            <rect
              key={`c${i}`}
              x={col * CELL}
              y={row * CELL}
              width={CELL}
              height={CELL}
              fill={(row + col) % 2 === 0 ? 'var(--bh-surface)' : 'var(--bh-surface-2)'}
              stroke="var(--bh-border)"
              strokeWidth={1}
            />
          );
        })}

        {/* highlights */}
        {[...highlightDest].map((i) => {
          const { cx, cy, row, col } = center(i);
          return (
            <g key={`d${i}`}>
              <rect x={col * CELL} y={row * CELL} width={CELL} height={CELL} fill="var(--bh-accent)" opacity={0.12} />
              <circle cx={cx} cy={cy} r={CELL * 0.16} fill="var(--bh-accent)" opacity={0.55} />
            </g>
          );
        })}
        {[...highlightPlace].map((i) => {
          const { cx, cy } = center(i);
          return <circle key={`p${i}`} cx={cx} cy={cy} r={CELL * 0.18} fill="var(--bh-accent)" opacity={0.55} />;
        })}

        {/* tokens */}
        {view.board.map((cell, i) =>
          cell ? (
            <Token key={`t${i}`} symbol={cell.symbol} color={cell.color} cx={center(i).cx} cy={center(i).cy} />
          ) : null,
        )}

        {/* totems */}
        <Totem symbol="X" cx={center(totemCell('X')).cx} cy={center(totemCell('X')).cy} selected={totem === 'X'} />
        <Totem symbol="O" cx={center(totemCell('O')).cx} cy={center(totemCell('O')).cy} selected={totem === 'O'} />

        {/* winning line */}
        {winLine && (
          <line
            x1={center(winLine[0]).cx}
            y1={center(winLine[0]).cy}
            x2={center(winLine[3]).cx}
            y2={center(winLine[3]).cy}
            stroke="var(--bh-success)"
            strokeWidth={8}
            strokeLinecap="round"
            opacity={0.85}
          />
        )}

        {/* click targets */}
        {Array.from({ length: N * N }, (_, i) => {
          const { row, col } = center(i);
          return (
            <rect
              key={`h${i}`}
              x={col * CELL}
              y={row * CELL}
              width={CELL}
              height={CELL}
              fill="transparent"
              style={{ cursor: myTurn ? 'pointer' : 'default' }}
              onClick={() => handleCell(i)}
            />
          );
        })}
      </svg>
    </div>
  );
}
