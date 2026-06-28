/**
 * Lobby page (route '/play'). Lists the public tables that are currently open,
 * lets a player join by code, and opens a modal to create a new table. The list
 * is seeded over REST and then kept in sync through the realtime lobby feed.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { useSocket } from '../state/SocketContext';
import { useToast } from '../state/ToastContext';
import { api, ApiError } from '../lib/api';
import { Icon } from '../components/Icon';
import { Loading } from '../components/Loading';
import { Avatar } from '../components/Avatar';
import { ClientEvent, ServerEvent } from '@boardhub/shared';
import type { GameCatalogEntry, TableSummary } from '@boardhub/shared';
import { Row, Col, Badge, Button, Form, Modal } from 'react-bootstrap';

const TURN_OPTIONS = [
  { value: 0, label: 'Không giới hạn' },
  { value: 15, label: '15 giây' },
  { value: 30, label: '30 giây' },
  { value: 60, label: '1 phút' },
  { value: 120, label: '2 phút' },
] as const;

function StatusBadge({ status }: { status: TableSummary['status'] }) {
  if (status === 'playing') {
    return <Badge bg="secondary">Đang chơi</Badge>;
  }
  if (status === 'finished') {
    return (
      <Badge bg="secondary-subtle" className="text-secondary-emphasis">
        Đã xong
      </Badge>
    );
  }
  return (
    <Badge bg="success-subtle" className="text-success-emphasis">
      Đang chờ
    </Badge>
  );
}

export function LobbyPage() {
  const navigate = useNavigate();
  const { isAuthed, user } = useAuth();
  const { socket } = useSocket();
  const { error, info } = useToast();

  const [tables, setTables] = useState<TableSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  // Create modal state.
  const [showModal, setShowModal] = useState(false);
  const [games, setGames] = useState<GameCatalogEntry[]>([]);
  const [gamesLoaded, setGamesLoaded] = useState(false);
  const [gameId, setGameId] = useState('');
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [turnSeconds, setTurnSeconds] = useState(0);
  const [allowSpectators, setAllowSpectators] = useState(true);
  const [creating, setCreating] = useState(false);

  const publicTables = useMemo(() => tables.filter((t) => !t.isPrivate), [tables]);

  // Seed the list over REST on mount.
  useEffect(() => {
    let active = true;
    api
      .tables()
      .then((res) => {
        if (active) setTables(res.tables);
      })
      .catch((err) => {
        if (active) error(err instanceof ApiError ? err.message : 'Không tải được danh sách bàn.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Keep the list in sync through the realtime lobby feed.
  useEffect(() => {
    if (!socket) return;
    const handleList = (incoming: TableSummary[]): void => setTables(incoming);
    socket.emit(ClientEvent.LobbySubscribe);
    socket.on(ServerEvent.LobbyList, handleList);
    return () => {
      socket.off(ServerEvent.LobbyList, handleList);
      socket.emit(ClientEvent.LobbyUnsubscribe);
    };
  }, [socket]);

  // Load the game catalog the first time the create modal opens.
  useEffect(() => {
    if (!showModal || gamesLoaded) return;
    let active = true;
    api
      .games()
      .then((list) => {
        if (!active) return;
        setGames(list);
        setGamesLoaded(true);
        if (list.length > 0) setGameId((prev) => prev || list[0].id);
      })
      .catch((err) => {
        if (active) error(err instanceof ApiError ? err.message : 'Không tải được danh sách trò chơi.');
      });
    return () => {
      active = false;
    };
  }, [showModal, gamesLoaded]);

  const handleRefresh = (): void => {
    setRefreshing(true);
    api
      .tables()
      .then((res) => {
        setTables(res.tables);
        info('Đã cập nhật danh sách bàn.');
      })
      .catch((err) => {
        error(err instanceof ApiError ? err.message : 'Không tải được danh sách bàn.');
      })
      .finally(() => setRefreshing(false));
  };

  const openCreate = (): void => {
    if (!isAuthed) {
      navigate('/login?next=/play');
      return;
    }
    setShowModal(true);
  };

  const goToTable = (id: string): void => {
    navigate(isAuthed ? `/table/${id}` : `/login?next=/table/${id}`);
  };

  const handleCreate = (): void => {
    if (!gameId) {
      error('Hãy chọn một trò chơi.');
      return;
    }
    setCreating(true);
    api
      .createTable({
        gameId,
        name: name.trim() || undefined,
        isPrivate,
        options: { turnSeconds, allowSpectators },
      })
      .then((res) => {
        navigate(`/table/${res.table.id}`);
      })
      .catch((err) => {
        error(err instanceof ApiError ? err.message : 'Không tạo được bàn.');
      })
      .finally(() => setCreating(false));
  };

  return (
    <div className="container-bh py-4">
      <div className="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-4">
        <div>
          <div className="bh-eyebrow">Sảnh chơi</div>
          <h1 className="mb-1 mt-1">Các bàn đang mở</h1>
          <p className="bh-muted mb-0">Chọn một bàn để tham gia, hoặc tạo một bàn mới.</p>
        </div>
        <div className="d-flex align-items-center gap-3 flex-wrap">
          {isAuthed && user ? (
            <span className="d-inline-flex align-items-center gap-2 bh-muted">
              <Avatar name={user.displayName} color={user.avatarColor} size={32} />
              <span className="d-none d-sm-inline">{user.displayName}</span>
            </span>
          ) : null}
          <div className="d-flex align-items-center gap-2">
            <Button
              variant="outline-secondary"
              onClick={handleRefresh}
              disabled={refreshing}
              className="d-inline-flex align-items-center gap-2"
            >
              <Icon name="refresh" size={18} />
              <span className="d-none d-sm-inline">Làm mới</span>
            </Button>
            <Button
              variant="primary"
              onClick={openCreate}
              className="d-inline-flex align-items-center gap-2"
            >
              <Icon name="plus" size={18} />
              Tạo bàn
            </Button>
          </div>
        </div>
      </div>

      <Form
        onSubmit={(e) => {
          e.preventDefault();
          const code = joinCode.trim().toUpperCase();
          if (code) navigate(`/table/${code}`);
        }}
        className="mb-4"
        style={{ maxWidth: '22rem' }}
      >
        <Form.Label className="bh-muted small mb-1">Vào bằng mã</Form.Label>
        <div className="d-flex gap-2">
          <Form.Control
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Nhập mã bàn"
            maxLength={4}
            autoComplete="off"
            aria-label="Mã bàn"
            style={{ textTransform: 'uppercase' }}
          />
          <Button type="submit" variant="outline-primary" className="flex-shrink-0">
            Vào
          </Button>
        </div>
      </Form>

      {loading ? (
        <Loading label="Đang tải danh sách bàn..." />
      ) : publicTables.length === 0 ? (
        <div className="bh-panel">
          <div className="bh-panel-body text-center py-5">
            <p className="bh-muted mb-3">Chưa có bàn nào đang mở.</p>
            <Button
              variant="primary"
              onClick={openCreate}
              className="d-inline-flex align-items-center gap-2"
            >
              <Icon name="plus" size={18} />
              Tạo bàn đầu tiên
            </Button>
          </div>
        </div>
      ) : (
        <Row className="g-3">
          {publicTables.map((table) => (
            <Col xs={12} md={6} lg={4} key={table.id}>
              <div className="bh-panel h-100 d-flex flex-column">
                <div className="bh-panel-head d-flex align-items-center justify-content-between gap-2">
                  <span className="text-truncate text-accent">{table.gameName}</span>
                  <StatusBadge status={table.status} />
                </div>
                <div className="bh-panel-body d-flex flex-column gap-2 flex-grow-1">
                  <div className="fw-semibold text-truncate">{table.name}</div>
                  <div className="bh-muted small">Chủ bàn: {table.hostName}</div>
                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <span className="d-inline-flex align-items-center gap-1 bh-muted">
                      <Icon name="users" size={16} />
                      {table.occupied}/{table.capacity}
                    </span>
                    <span className="bh-code-pill">{table.code}</span>
                  </div>
                  <Button
                    variant="primary"
                    className="w-100 mt-auto"
                    onClick={() => goToTable(table.id)}
                  >
                    Vào bàn
                  </Button>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Tạo bàn mới</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!gamesLoaded ? (
            <Loading label="Đang tải trò chơi..." />
          ) : (
            <Form>
              <Form.Group className="mb-3" controlId="create-game">
                <Form.Label>Trò chơi</Form.Label>
                <Form.Select value={gameId} onChange={(e) => setGameId(e.target.value)}>
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3" controlId="create-name">
                <Form.Label>Tên bàn</Form.Label>
                <Form.Control
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tên bàn (không bắt buộc)"
                  maxLength={40}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="create-turn">
                <Form.Label>Thời gian mỗi lượt</Form.Label>
                <Form.Select
                  value={String(turnSeconds)}
                  onChange={(e) => setTurnSeconds(Number(e.target.value))}
                >
                  {TURN_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Check
                type="switch"
                id="create-private"
                label="Bàn riêng tư"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="mb-2"
              />
              <Form.Check
                type="switch"
                id="create-spectators"
                label="Cho phép người xem"
                checked={allowSpectators}
                onChange={(e) => setAllowSpectators(e.target.checked)}
              />
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={!gameId || creating}>
            {creating ? 'Đang tạo...' : 'Tạo bàn'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
