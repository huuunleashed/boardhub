import { useMemo, useState } from 'react';
import type { CollectAction, CollectView, Species } from '@boardhub/engine';
import type { GamePlayerInfo } from '@boardhub/shared';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { AnimalGlyph, CollectCard, SPECIES_COLOR, withTip } from './animals';
import './collect.css';

interface Props {
  view: CollectView;
  interactive: boolean;
  yourSeat: number | null;
  players: GamePlayerInfo[];
  onAction: (action: CollectAction) => void;
}

export function CollectTable({ view, interactive, yourSeat, players, onAction }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showLegend, setShowLegend] = useState(false);

  const speciesMeta = useMemo(() => {
    const map = new Map<Species, { name: string; base: number }>();
    for (const s of view.species) map.set(s.id, { name: s.name, base: s.base });
    return map;
  }, [view.species]);
  const name = (sp: Species): string => speciesMeta.get(sp)?.name ?? sp;
  const base = (sp: Species): number => speciesMeta.get(sp)?.base ?? 1;

  const myTurn = interactive && yourSeat !== null && view.toMove === yourSeat && !view.over;

  const handGroups = useMemo(() => {
    const groups = new Map<Species, number>();
    for (const c of view.yourHand) groups.set(c.species, (groups.get(c.species) ?? 0) + 1);
    return groups;
  }, [view.yourHand]);

  const sortedHand = useMemo(
    () => [...view.yourHand].sort((a, b) => (a.species === b.species ? a.id.localeCompare(b.id) : a.species.localeCompare(b.species))),
    [view.yourHand],
  );

  const selectedCards = sortedHand.filter((c) => selected.has(c.id));
  const selSpecies = new Set(selectedCards.map((c) => c.species));
  const canLockSelected = myTurn && selectedCards.length >= 3 && selSpecies.size === 1;
  const canDraw = view.deckCount > 0;
  const canTake = view.meadow.some((c) => c !== null);
  const canPass = !canDraw && !canTake && ![...handGroups.values()].some((n) => n >= 3);

  const toggle = (id: string): void =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const lockSelected = (): void => {
    if (!canLockSelected) return;
    onAction({ type: 'lock', species: [...selSpecies][0], count: selectedCards.length });
    setSelected(new Set());
  };

  const info = (seat: number): GamePlayerInfo | undefined => players.find((p) => p.seatIndex === seat);

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <span className="d-inline-flex align-items-center gap-2 fw-semibold">
          <Icon name="dice" size={18} /> Bộ rút {view.deckCount} lá
          {view.finalRound && <span className="badge text-bg-warning">Lượt cuối</span>}
        </span>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowLegend((v) => !v)}>
          <Icon name="info" size={16} /> {showLegend ? 'Ẩn loài' : 'Các loài và điểm'}
        </button>
      </div>

      {showLegend && (
        <div className="bh-panel">
          <div className="bh-panel-head">Tám loài (di chuột vào lá để xem chi tiết)</div>
          <div className="bh-panel-body d-flex gap-2 flex-wrap">
            {view.species.map((s) => withTip(s.id, s.name, s.base, <span>{<CollectCard species={s.id} name={s.name} base={s.base} size="sm" />}</span>))}
          </div>
        </div>
      )}

      {/* Meadow */}
      <div className="bh-panel">
        <div className="bh-panel-head">Đồng cỏ</div>
        <div className="bh-panel-body d-flex gap-2 flex-wrap align-items-center">
          <span className="ct-deck">{view.deckCount}</span>
          {view.meadow.map((card, i) =>
            card
              ? withTip(card.species, name(card.species), base(card.species), (
                  <CollectCard
                    key={card.id}
                    species={card.species}
                    name={name(card.species)}
                    base={base(card.species)}
                    disabled={!myTurn}
                    onClick={() => onAction({ type: 'take', meadowIndex: i })}
                  />
                ))
              : <span key={`e${i}`} className="ct-empty ct-card sm" />,
          )}
        </div>
      </div>

      {/* Players */}
      <div className="row g-2">
        {view.players.map((p) => {
          const pi = info(p.seatIndex);
          const turn = view.toMove === p.seatIndex && !view.over;
          return (
            <div className="col-12 col-md-6" key={p.seatIndex}>
              <div className={`bh-seat${turn ? ' turn' : ''}`} style={{ alignItems: 'flex-start' }}>
                <Avatar name={pi?.displayName ?? `Ghế ${p.seatIndex + 1}`} color={pi?.avatarColor ?? '#6b7280'} size={34} />
                <div className="flex-grow-1 min-w-0">
                  <div className="d-flex justify-content-between">
                    <span className="fw-semibold text-truncate">
                      {pi?.displayName ?? `Ghế ${p.seatIndex + 1}`}
                      {p.seatIndex === yourSeat && <span className="bh-muted"> (bạn)</span>}
                      {pi?.isBot && <span className="bh-muted"> · máy</span>}
                    </span>
                    <span className="badge text-bg-light">{p.score} điểm · {p.handCount} lá</span>
                  </div>
                  <div className="d-flex gap-1 flex-wrap mt-1">
                    {p.locked.length === 0 ? (
                      <span className="bh-muted" style={{ fontSize: 12 }}>Chưa khóa bộ nào</span>
                    ) : (
                      p.locked.map((set, i) => (
                        <span key={i} className="ct-locked" style={{ backgroundColor: SPECIES_COLOR[set.species] }}>
                          <AnimalGlyph species={set.species} size={16} /> x{set.size} = {set.points}
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
          <div className="bh-panel-head d-flex justify-content-between">
            <span>Bài trên tay</span>
            <span className="bh-muted" style={{ fontWeight: 400, fontSize: 13 }}>{view.yourHand.length} lá · chọn 3 lá cùng loài để khóa</span>
          </div>
          <div className="bh-panel-body d-flex flex-column gap-3">
            <div className="d-flex gap-2 flex-wrap">
              {sortedHand.length === 0 ? (
                <span className="bh-muted">Tay trống.</span>
              ) : (
                sortedHand.map((card, idx) =>
                  withTip(card.species, name(card.species), base(card.species), (
                    <CollectCard
                      key={card.id}
                      species={card.species}
                      name={name(card.species)}
                      base={base(card.species)}
                      dealIndex={idx}
                      selected={selected.has(card.id)}
                      onClick={() => toggle(card.id)}
                    />
                  )),
                )
              )}
            </div>
            <div className="d-flex gap-2 flex-wrap align-items-center">
              <button type="button" className="btn btn-primary btn-sm" disabled={!myTurn || !canDraw} onClick={() => onAction({ type: 'draw' })}>
                <Icon name="plus" size={16} /> Rút lá ({view.deckCount})
              </button>
              <button type="button" className="btn btn-outline-primary btn-sm" disabled={!canLockSelected} onClick={lockSelected}>
                <Icon name="check" size={16} /> Khóa đã chọn ({selectedCards.length})
              </button>
              {selected.size > 0 && (
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setSelected(new Set())}>
                  Bỏ chọn
                </button>
              )}
              {canPass && (
                <button type="button" className="btn btn-outline-secondary btn-sm" disabled={!myTurn} onClick={() => onAction({ type: 'pass' })}>
                  Bỏ lượt
                </button>
              )}
            </div>
            <div className="bh-muted" style={{ fontSize: 13 }}>
              {myTurn
                ? 'Lượt của bạn: lấy một lá ở Đồng cỏ, rút một lá úp, hoặc chọn ba lá cùng loài rồi khóa thành bộ.'
                : 'Đợi tới lượt của bạn.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
