import { useMemo } from 'react';
import type { CollectAction, CollectView, Species } from '@boardhub/engine';
import type { GamePlayerInfo } from '@boardhub/shared';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';

const SPECIES_COLOR: Record<Species, string> = {
  rabbit: '#9aa7b1',
  otter: '#6b8f9e',
  fox: '#c5703a',
  owl: '#7a6a9e',
  deer: '#7f9a55',
  hedgehog: '#a9885f',
  wolf: '#5f6b76',
  bear: '#6b4f3a',
};

interface Props {
  view: CollectView;
  interactive: boolean;
  yourSeat: number | null;
  players: GamePlayerInfo[];
  onAction: (action: CollectAction) => void;
}

function Card({ species, name, faded }: { species: Species; name: string; faded?: boolean }) {
  return (
    <div
      style={{
        width: 58,
        height: 80,
        borderRadius: 8,
        border: '1px solid var(--bh-border-strong)',
        background: 'var(--bh-surface)',
        overflow: 'hidden',
        opacity: faded ? 0.5 : 1,
        display: 'flex',
        flexDirection: 'column',
        flex: '0 0 auto',
      }}
    >
      <div style={{ height: 26, backgroundColor: SPECIES_COLOR[species] }} />
      <div className="d-flex align-items-center justify-content-center text-center fw-semibold" style={{ flex: 1, fontSize: 12, padding: 2 }}>
        {name}
      </div>
    </div>
  );
}

function CardBack() {
  return (
    <div
      style={{
        width: 40,
        height: 56,
        borderRadius: 6,
        border: '1px solid var(--bh-border-strong)',
        background: 'var(--bh-surface-2)',
        flex: '0 0 auto',
      }}
    />
  );
}

export function CollectTable({ view, interactive, yourSeat, players, onAction }: Props) {
  const speciesName = useMemo(() => {
    const map = new Map<Species, string>();
    for (const s of view.species) map.set(s.id, s.name);
    return map;
  }, [view.species]);

  const myTurn = interactive && yourSeat !== null && view.toMove === yourSeat && !view.over;

  const handGroups = useMemo(() => {
    const groups = new Map<Species, number>();
    for (const card of view.yourHand) groups.set(card.species, (groups.get(card.species) ?? 0) + 1);
    return [...groups.entries()].sort((a, b) => b[1] - a[1]);
  }, [view.yourHand]);

  const canDraw = view.deckCount > 0;
  const canTake = view.meadow.some((c) => c !== null);
  const canLock = handGroups.some(([, n]) => n >= 3);
  const canPass = !canDraw && !canTake && !canLock;

  const playerInfo = (seat: number): GamePlayerInfo | undefined => players.find((p) => p.seatIndex === seat);

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <Icon name="dice" size={18} />
          <span className="fw-semibold">Bộ rút: {view.deckCount} lá</span>
        </div>
        {view.finalRound && <span className="badge text-bg-warning">Lượt cuối</span>}
      </div>

      {/* Meadow */}
      <div className="bh-panel">
        <div className="bh-panel-head">Đồng cỏ</div>
        <div className="bh-panel-body d-flex gap-2 flex-wrap">
          {view.meadow.map((card, i) =>
            card ? (
              <button
                key={card.id}
                type="button"
                className="btn p-0 border-0 bg-transparent"
                disabled={!myTurn}
                style={{ cursor: myTurn ? 'pointer' : 'default' }}
                onClick={() => onAction({ type: 'take', meadowIndex: i })}
                title={myTurn ? 'Lấy lá này' : undefined}
              >
                <Card species={card.species} name={speciesName.get(card.species) ?? card.species} />
              </button>
            ) : (
              <div key={`empty-${i}`} style={{ width: 58, height: 80, borderRadius: 8, border: '1px dashed var(--bh-border-strong)' }} />
            ),
          )}
        </div>
      </div>

      {/* Players */}
      <div className="row g-2">
        {view.players.map((p) => {
          const info = playerInfo(p.seatIndex);
          const isYou = p.seatIndex === yourSeat;
          const turn = view.toMove === p.seatIndex && !view.over;
          return (
            <div className="col-12 col-md-6" key={p.seatIndex}>
              <div className={`bh-seat${turn ? ' turn' : ''}`} style={{ alignItems: 'flex-start' }}>
                <Avatar name={info?.displayName ?? `Ghế ${p.seatIndex + 1}`} color={info?.avatarColor ?? '#6b7280'} size={36} />
                <div className="flex-grow-1 min-w-0">
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="fw-semibold text-truncate">
                      {info?.displayName ?? `Ghế ${p.seatIndex + 1}`}
                      {isYou && <span className="bh-muted"> (bạn)</span>}
                      {info?.isBot && <span className="bh-muted"> · máy</span>}
                    </span>
                    <span className="badge text-bg-light">{p.score} điểm</span>
                  </div>
                  <div className="bh-muted" style={{ fontSize: 13 }}>
                    {p.handCount} lá trên tay
                  </div>
                  <div className="d-flex gap-1 flex-wrap mt-1">
                    {p.locked.length === 0 ? (
                      <span className="bh-muted" style={{ fontSize: 12 }}>
                        Chưa khóa bộ nào
                      </span>
                    ) : (
                      p.locked.map((set, idx) => (
                        <span
                          key={idx}
                          className="badge"
                          style={{ backgroundColor: SPECIES_COLOR[set.species], color: '#fff' }}
                          title={`${speciesName.get(set.species) ?? set.species}`}
                        >
                          {speciesName.get(set.species) ?? set.species} x{set.size} = {set.points}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Your hand */}
      {yourSeat !== null && (
        <div className="bh-panel">
          <div className="bh-panel-head d-flex align-items-center justify-content-between">
            <span>Bài trên tay của bạn</span>
            <span className="bh-muted" style={{ fontSize: 13, fontWeight: 400 }}>
              {view.yourHand.length} lá
            </span>
          </div>
          <div className="bh-panel-body d-flex flex-column gap-3">
            <div className="d-flex gap-2 flex-wrap">
              {view.yourHand.length === 0 ? (
                <span className="bh-muted">Tay trống.</span>
              ) : (
                view.yourHand.map((card) => (
                  <Card key={card.id} species={card.species} name={speciesName.get(card.species) ?? card.species} />
                ))
              )}
            </div>

            <div className="d-flex gap-2 flex-wrap align-items-center">
              <button type="button" className="btn btn-primary btn-sm" disabled={!myTurn || !canDraw} onClick={() => onAction({ type: 'draw' })}>
                <Icon name="plus" size={16} /> Rút lá ({view.deckCount})
              </button>
              {handGroups
                .filter(([, n]) => n >= 3)
                .map(([species, n]) => (
                  <button
                    key={species}
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    disabled={!myTurn}
                    onClick={() => onAction({ type: 'lock', species })}
                  >
                    <Icon name="check" size={16} /> Khóa {speciesName.get(species) ?? species} ({n})
                  </button>
                ))}
              {canPass && (
                <button type="button" className="btn btn-outline-secondary btn-sm" disabled={!myTurn} onClick={() => onAction({ type: 'pass' })}>
                  Bỏ lượt
                </button>
              )}
            </div>
            {myTurn ? (
              <div className="bh-muted" style={{ fontSize: 13 }}>
                Lượt của bạn: rút một lá, lấy một lá từ Đồng cỏ, hoặc khóa một bộ từ ba lá cùng loài.
              </div>
            ) : (
              <div className="bh-muted" style={{ fontSize: 13 }}>
                Đợi tới lượt của bạn.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
