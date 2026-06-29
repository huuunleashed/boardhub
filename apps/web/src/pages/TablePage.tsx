import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { CollectView, OxonoView } from '@boardhub/engine';
import type { GameSnapshot, TableSeat, TableState } from '@boardhub/shared';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Loading } from '../components/Loading';
import { CollapsiblePanel } from '../components/CollapsiblePanel';
import { Chat } from '../components/table/Chat';
import { CollectTable } from '../games/collect/CollectTable';
import { OxonoBoard } from '../games/oxono/OxonoBoard';
import { useTable } from '../hooks/useTable';
import { formatClock } from '../lib/format';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';

const TURN_OPTIONS = [
  { v: 0, l: 'Không giới hạn' },
  { v: 15, l: '15 giây' },
  { v: 30, l: '30 giây' },
  { v: 60, l: '1 phút' },
  { v: 120, l: '2 phút' },
];

function TurnClock({ deadline }: { deadline: number | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!deadline) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [deadline]);
  if (!deadline) return null;
  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  return <span className="badge text-bg-light">Còn {formatClock(left)}</span>;
}

export function TablePage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const t = useTable(id);
  const { table, snapshot, chat, closedReason } = t;

  const copy = (text: string, label: string): void => {
    navigator.clipboard?.writeText(text).then(
      () => toast.success(`Đã sao chép ${label}.`),
      () => toast.warning('Không sao chép được, hãy chép thủ công.'),
    );
  };

  if (closedReason) {
    return (
      <div className="container-bh py-5 text-center">
        <h2>Bàn đã đóng</h2>
        <p className="bh-muted">{closedReason}</p>
        <Link to="/play" className="btn btn-primary">
          Về sảnh chơi
        </Link>
      </div>
    );
  }

  if (!table) return <Loading label="Đang vào bàn..." />;

  const isHost = user?.id === table.hostId;
  const mySeat = table.seats.find((s) => s.userId === user?.id);
  const occupied = table.seats.filter((s) => s.userId || s.isBot).length;
  const shareUrl = `${window.location.origin}/table/${table.code}`;

  let startReason = '';
  if (occupied < table.minPlayers) startReason = `Cần ít nhất ${table.minPlayers} người chơi`;
  else if (table.seats.some((s) => s.userId && !s.isReady)) startReason = 'Chờ mọi người bấm sẵn sàng';

  return (
    <div className="container-bh py-3">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div>
          <div className="bh-eyebrow">{table.gameName}</div>
          <h2 className="mb-0">{table.name}</h2>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="bh-muted">Mã bàn</span>
          <button
            type="button"
            className="bh-code-pill bh-clickable border-0"
            onClick={() => copy(table.code, 'mã bàn')}
            aria-label={`Sao chép mã bàn ${table.code}`}
            title="Sao chép mã bàn"
          >
            {table.code}
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => copy(shareUrl, 'liên kết')}>
            <Icon name="link" size={16} /> Chép liên kết
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              t.leave();
              navigate('/play');
            }}
          >
            Rời bàn
          </button>
        </div>
      </div>

      {table.status === 'lobby' ? (
        <LobbyView table={table} mySeat={mySeat} isHost={isHost} startReason={startReason} actions={t} shareUrl={shareUrl} />
      ) : (
        <GameView table={table} snapshot={snapshot} actions={t} />
      )}
    </div>
  );
}

interface LobbyProps {
  table: TableState;
  mySeat: TableSeat | undefined;
  isHost: boolean;
  startReason: string;
  shareUrl: string;
  actions: ReturnType<typeof useTable>;
}

function LobbyView({ table, mySeat, isHost, startReason, actions }: LobbyProps) {
  return (
    <div className="row g-3">
      <div className="col-12 col-lg-8">
        <div className="bh-panel mb-3">
          <div className="bh-panel-head d-flex align-items-center justify-content-between">
            <span>Người chơi ({table.seats.filter((s) => s.userId || s.isBot).length}/{table.capacity})</span>
            <span className="bh-muted" style={{ fontWeight: 400, fontSize: 13 }}>
              Tối thiểu {table.minPlayers} người
            </span>
          </div>
          <div className="bh-panel-body">
            <div className="row g-2">
              {table.seats.map((seat) => (
                <div className="col-12 col-sm-6" key={seat.index}>
                  <SeatCard seat={seat} table={table} mySeat={mySeat} isHost={isHost} actions={actions} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {isHost && <OptionsPanel table={table} actions={actions} />}

        <div className="d-flex align-items-center gap-3 mt-3 flex-wrap">
          {isHost ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={Boolean(startReason)}
              onClick={() => actions.start()}
              title={startReason || undefined}
            >
              <Icon name="play" size={18} /> Bắt đầu ván
            </button>
          ) : (
            <span className="bh-muted">Chờ chủ bàn bắt đầu.</span>
          )}
          {startReason && <span className="bh-muted">{startReason}</span>}
        </div>
      </div>

      <div className="col-12 col-lg-4">
        <SidePanel table={table} actions={actions} />
      </div>
    </div>
  );
}

function SeatCard({
  seat,
  table,
  mySeat,
  isHost,
  actions,
}: {
  seat: TableSeat;
  table: TableState;
  mySeat: TableSeat | undefined;
  isHost: boolean;
  actions: ReturnType<typeof useTable>;
}) {
  const occupiedByMe = mySeat?.index === seat.index;
  if (!seat.userId && !seat.isBot) {
    return (
      <div className="bh-seat empty justify-content-between">
        <span>Ghế trống</span>
        <div className="d-flex gap-1">
          {!mySeat && (
            <button className="btn btn-sm btn-outline-primary" onClick={() => actions.sit(seat.index)}>
              Ngồi
            </button>
          )}
          {isHost && (
            <button className="btn btn-sm btn-outline-secondary" onClick={() => actions.addBot(seat.index)} title="Thêm máy">
              <Icon name="robot" size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className={`bh-seat${occupiedByMe ? ' active' : ''}`}>
      <Avatar name={seat.displayName ?? 'Người chơi'} color={seat.avatarColor ?? '#6b7280'} size={36} />
      <div className="flex-grow-1 min-w-0">
        <div className="text-truncate fw-semibold">
          {seat.displayName}
          {seat.userId === table.hostId && <span className="badge text-bg-light ms-1">Chủ</span>}
          {seat.isBot && <span className="badge text-bg-light ms-1">Máy</span>}
        </div>
        <div className="d-flex align-items-center gap-1" style={{ fontSize: 13 }}>
          <span className={`bh-dot${seat.isReady ? ' on' : ''}`} />
          <span className="bh-muted">{seat.isReady ? 'Sẵn sàng' : 'Chưa sẵn sàng'}</span>
        </div>
      </div>
      <div className="d-flex flex-column gap-1">
        {occupiedByMe && (
          <>
            <button className={`btn btn-sm ${seat.isReady ? 'btn-outline-secondary' : 'btn-primary'}`} onClick={() => actions.setReady(!seat.isReady)}>
              {seat.isReady ? 'Hủy' : 'Sẵn sàng'}
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => actions.stand()}>
              Đứng dậy
            </button>
          </>
        )}
        {isHost && !occupiedByMe && seat.isBot && (
          <button className="btn btn-sm btn-outline-danger" onClick={() => actions.removeBot(seat.index)}>
            Xóa máy
          </button>
        )}
        {isHost && !occupiedByMe && seat.userId && (
          <button className="btn btn-sm btn-outline-danger" onClick={() => actions.kick(seat.index)}>
            Mời ra
          </button>
        )}
      </div>
    </div>
  );
}

function OptionsPanel({ table, actions }: { table: TableState; actions: ReturnType<typeof useTable> }) {
  return (
    <div className="bh-panel">
      <div className="bh-panel-head">Tùy chọn bàn</div>
      <div className="bh-panel-body d-flex flex-column gap-3">
        <div>
          <label className="form-label mb-1">Tên bàn</label>
          <input
            className="form-control form-control-sm"
            defaultValue={table.name}
            maxLength={40}
            onBlur={(e) => actions.setOptions({ name: e.target.value })}
          />
        </div>
        <div>
          <label className="form-label mb-1">Thời gian mỗi lượt</label>
          <select
            className="form-select form-select-sm"
            value={table.options.turnSeconds}
            onChange={(e) => actions.setOptions({ turnSeconds: Number(e.target.value) })}
          >
            {TURN_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        </div>
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            type="checkbox"
            id="allowSpec"
            checked={table.options.allowSpectators}
            onChange={(e) => actions.setOptions({ allowSpectators: e.target.checked })}
          />
          <label className="form-check-label" htmlFor="allowSpec">
            Cho phép người xem
          </label>
        </div>
      </div>
    </div>
  );
}

function SidePanel({ table, actions }: { table: TableState; actions: ReturnType<typeof useTable> }) {
  return (
    <>
      {table.spectators.length > 0 && (
        <div className="bh-panel mb-3">
          <div className="bh-panel-head">Người xem ({table.spectators.length})</div>
          <div className="bh-panel-body d-flex flex-wrap gap-2">
            {table.spectators.map((s) => (
              <span key={s.userId} className="d-inline-flex align-items-center gap-1">
                <Avatar name={s.displayName} color={s.avatarColor} size={22} />
                <span style={{ fontSize: 13 }}>{s.displayName}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="bh-panel" style={{ height: 360, display: 'flex', flexDirection: 'column' }}>
        <div className="bh-panel-head">Trò chuyện</div>
        <Chat messages={actions.chat} onSend={actions.sendChat} />
      </div>
    </>
  );
}

function GameView({
  table,
  snapshot,
  actions,
}: {
  table: TableState;
  snapshot: GameSnapshot | null;
  actions: ReturnType<typeof useTable>;
}) {
  if (!snapshot) return <Loading label="Đang tải ván đấu..." />;

  const yourSeat = snapshot.yourSeat;
  const playerName = (seat: number): string =>
    snapshot.players.find((p) => p.seatIndex === seat)?.displayName ?? `Ghế ${seat + 1}`;

  const result = snapshot.result;
  const turnName = snapshot.turn >= 0 ? playerName(snapshot.turn) : '';

  return (
    <div className="row g-3">
      <div className="col-12 col-lg-8">
        {result ? (
          <div className="bh-panel mb-3">
            <div className="bh-panel-body d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <Icon name="trophy" size={22} />
                <strong>
                  {result.kind === 'draw'
                    ? 'Ván hòa'
                    : `${result.winners.map(playerName).join(', ')} thắng`}
                </strong>
              </div>
              {yourSeat !== null && (
                <button className="btn btn-primary btn-sm" onClick={() => actions.rematch()}>
                  <Icon name="refresh" size={16} /> Đấu lại
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span className="d-inline-flex align-items-center gap-2">
              <span className="bh-dot on" /> Lượt của <strong>{turnName}</strong>
              {snapshot.turn === yourSeat && <span className="badge text-bg-success">Bạn đi</span>}
            </span>
            <TurnClock deadline={snapshot.turnDeadline} />
          </div>
        )}

        <div className="bh-panel">
          <div className="bh-panel-body">
            {table.gameId === 'oxono' ? (
              <div className="d-flex flex-column align-items-center gap-3">
                <OxonoPlayers snapshot={snapshot} view={snapshot.state as OxonoView} />
                <div style={{ width: '100%', maxWidth: 460 }}>
                  <OxonoBoard
                    view={snapshot.state as OxonoView}
                    interactive={yourSeat !== null && !result}
                    yourSeat={yourSeat}
                    onAction={(a) => actions.sendAction(a)}
                  />
                </div>
              </div>
            ) : (
              <CollectTable
                view={snapshot.state as CollectView}
                interactive={yourSeat !== null && !result}
                yourSeat={yourSeat}
                players={snapshot.players}
                onAction={(a) => actions.sendAction(a)}
              />
            )}
          </div>
        </div>
      </div>

      <div className="col-12 col-lg-4">
        <div className="bh-panel mb-3">
          <div className="bh-panel-head">Diễn biến</div>
          <div className="bh-panel-body bh-log">
            {snapshot.log.length === 0 ? (
              <span className="bh-muted">Chưa có nước đi.</span>
            ) : (
              [...snapshot.log]
                .slice(-40)
                .reverse()
                .map((entry) => (
                  <div className="bh-log-entry" key={entry.id}>
                    {entry.seatIndex !== undefined && <strong>{playerName(entry.seatIndex)} </strong>}
                    {entry.text}
                  </div>
                ))
            )}
          </div>
        </div>
        <CollapsiblePanel title="Trò chuyện" fill style={{ height: 320 }}>
          <Chat messages={actions.chat} onSend={actions.sendChat} />
        </CollapsiblePanel>
      </div>
    </div>
  );
}

function OxonoPlayers({ snapshot, view }: { snapshot: GameSnapshot; view: OxonoView }) {
  const colors = ['var(--bh-pink)', 'var(--bh-black)'];
  const colorNames = ['Hồng', 'Đen'];
  return (
    <div className="d-flex gap-2 flex-wrap justify-content-center w-100">
      {snapshot.players.map((p) => (
        <div key={p.seatIndex} className={`bh-seat${snapshot.turn === p.seatIndex ? ' turn' : ''}`} style={{ flex: '1 1 180px', maxWidth: 220 }}>
          <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: colors[p.seatIndex], flex: '0 0 auto' }} />
          <div className="flex-grow-1 min-w-0">
            <div className="text-truncate fw-semibold" style={{ fontSize: 14 }}>
              {p.displayName} {!p.isConnected && !p.isBot && <span className="bh-muted">(mất kết nối)</span>}
            </div>
            <div className="bh-muted" style={{ fontSize: 12 }}>
              {colorNames[p.seatIndex]} · X:{view.reserves[p.seatIndex].X} O:{view.reserves[p.seatIndex].O}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
