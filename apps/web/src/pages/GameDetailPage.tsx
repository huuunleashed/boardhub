/**
 * Game detail page (route '/games/:id'). Shows a single game's overview and
 * rules, plus a panel to create a new table or join an open public table.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { api, ApiError } from '../lib/api';
import { Icon } from '../components/Icon';
import { Loading } from '../components/Loading';
import type { GameCatalogEntry, TableSummary } from '@boardhub/shared';
import { Row, Col, Badge, Button } from 'react-bootstrap';

const META_BADGE_STYLE = {
  backgroundColor: 'var(--bh-surface-2)',
  color: 'var(--bh-ink-soft)',
  border: '1px solid var(--bh-border)',
  fontWeight: 600,
};

const STATUS_LABEL: Record<TableSummary['status'], string> = {
  lobby: 'Đang chờ',
  playing: 'Đang chơi',
  finished: 'Đã xong',
};

const STATUS_COLOR: Record<TableSummary['status'], string> = {
  lobby: 'var(--bh-accent)',
  playing: 'var(--bh-success)',
  finished: 'var(--bh-muted)',
};

export function GameDetailPage() {
  const { id } = useParams();
  const { isAuthed } = useAuth();
  const { error } = useToast();
  const navigate = useNavigate();

  const [game, setGame] = useState<GameCatalogEntry | null>(null);
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([api.games(), api.tables()])
      .then(([games, tableRes]) => {
        if (!active) return;
        setGame(games.find((g) => g.id === id) ?? null);
        setTables(tableRes.tables.filter((t) => t.gameId === id));
      })
      .catch((err) => {
        if (!active) return;
        error(err instanceof ApiError ? err.message : 'Không tải được trò chơi.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, error]);

  const openTables = tables.filter((t) => !t.isPrivate);

  const handleCreate = async (): Promise<void> => {
    if (!game) return;
    setCreating(true);
    try {
      const res = await api.createTable({ gameId: game.id });
      navigate(`/table/${res.table.id}`);
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Không tạo được bàn.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container-bh py-4">
      <Link
        to="/games"
        className="bh-muted text-decoration-none d-inline-flex align-items-center gap-1 mb-3"
      >
        <Icon name="arrowRight" size={16} style={{ transform: 'rotate(180deg)' }} />
        Về thư viện
      </Link>

      {loading ? (
        <Loading />
      ) : !game ? (
        <div className="text-center py-5">
          <p className="bh-muted mb-3">Không tìm thấy trò chơi.</p>
          <Link to="/games" className="btn btn-outline-secondary">
            Về thư viện
          </Link>
        </div>
      ) : (
        <Row className="g-4">
          <Col lg={7}>
            <div className="bh-eyebrow">
              {game.minPlayers}-{game.maxPlayers} người
            </div>
            <h1 className="mt-2 mb-2">{game.name}</h1>
            <p className="bh-muted">{game.tagline}</p>
            <div className="d-flex flex-wrap gap-2 mb-3">
              <Badge bg="" style={META_BADGE_STYLE}>
                {game.estimatedMinutes} phút
              </Badge>
              {game.hasHiddenInfo && (
                <Badge bg="" style={META_BADGE_STYLE}>
                  Thông tin ẩn
                </Badge>
              )}
              {game.supportsBots && (
                <Badge bg="" style={META_BADGE_STYLE}>
                  Có máy
                </Badge>
              )}
            </div>
            <p>{game.description}</p>

            <div className="bh-panel mt-3">
              <div className="bh-panel-head">Luật chơi</div>
              <div className="bh-panel-body">
                <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
                  {game.rules.map((rule) => (
                    <li key={rule} className="d-flex align-items-start gap-2">
                      <span
                        className="text-accent"
                        style={{ flex: '0 0 auto', marginTop: '2px' }}
                      >
                        <Icon name="check" size={16} />
                      </span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Col>

          <Col lg={5}>
            <div className="bh-panel">
              <div className="bh-panel-head">Bắt đầu</div>
              <div className="bh-panel-body">
                {isAuthed ? (
                  <Button
                    variant="primary"
                    className="w-100 d-inline-flex align-items-center justify-content-center gap-2"
                    disabled={creating}
                    onClick={handleCreate}
                  >
                    <Icon name="plus" size={18} />
                    Tạo bàn mới
                  </Button>
                ) : (
                  <Link
                    to={`/login?next=/games/${game.id}`}
                    className="btn btn-primary w-100 d-inline-flex align-items-center justify-content-center gap-2"
                  >
                    Đăng nhập để chơi
                  </Link>
                )}
              </div>
            </div>

            <div className="bh-panel mt-3">
              <div className="bh-panel-head">Bàn đang mở</div>
              <div className="bh-panel-body">
                {openTables.length === 0 ? (
                  <p className="bh-muted mb-0">Chưa có bàn nào, hãy tạo bàn mới.</p>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {openTables.map((t) => (
                      <div key={t.id} className="bh-seat">
                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                          <div className="fw-semibold text-truncate">{t.name || t.gameName}</div>
                          <div className="bh-muted small text-truncate">
                            {t.hostName} ({t.occupied}/{t.capacity})
                          </div>
                        </div>
                        <Badge bg="" style={{ ...META_BADGE_STYLE, color: STATUS_COLOR[t.status] }}>
                          {STATUS_LABEL[t.status]}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={() => navigate(`/table/${t.id}`)}
                        >
                          Vào
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Col>
        </Row>
      )}
    </div>
  );
}
