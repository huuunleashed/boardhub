/**
 * Game catalog page (route '/games'). Lists every game in the library so the
 * player can pick one, read its details and create a table to play with friends.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { Icon } from '../components/Icon';
import { Loading } from '../components/Loading';
import type { GameCatalogEntry } from '@boardhub/shared';
import { Row, Col, Badge } from 'react-bootstrap';

export function GameCatalogPage() {
  const [games, setGames] = useState<GameCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .games()
      .then((list) => {
        if (active) setGames(list);
      })
      .catch((err) => {
        if (!active) return;
        const message =
          err instanceof ApiError ? err.message : 'Không tải được danh sách trò chơi.';
        setError(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="container-bh py-4">
      <header className="mb-4" style={{ maxWidth: '44rem' }}>
        <div className="bh-eyebrow">Trò chơi</div>
        <h1 className="mt-2 mb-2">Thư viện trò chơi</h1>
        <p className="lead bh-muted mb-0">
          Chọn một trò chơi bạn thích, xem luật chơi rồi tạo một bàn để rủ bạn bè vào chơi
          cùng.
        </p>
      </header>

      {loading ? (
        <Loading label="Đang tải trò chơi..." />
      ) : error ? (
        <p className="bh-muted mb-0">{error}</p>
      ) : games.length === 0 ? (
        <p className="bh-muted mb-0">
          Chưa có trò chơi nào trong thư viện. Bạn hãy quay lại sau nhé.
        </p>
      ) : (
        <Row className="g-3">
          {games.map((g) => (
            <Col xs={12} sm={6} lg={4} key={g.id}>
              <Link
                to={`/games/${g.id}`}
                className="text-reset text-decoration-none d-block h-100"
              >
                <div className="bh-game-card">
                  <div className="bh-game-cover">
                    <span
                      style={{
                        fontSize: '44px',
                        fontWeight: 750,
                        lineHeight: 1,
                        color: 'var(--bh-accent)',
                      }}
                    >
                      {g.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="p-3 d-flex flex-column gap-2">
                    <h3 className="mb-0">{g.name}</h3>
                    <p className="bh-muted mb-0">{g.tagline}</p>
                    <p
                      className="mb-0"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {g.description}
                    </p>
                    <div className="d-flex flex-wrap gap-1">
                      <Badge bg="light" text="dark">
                        {`${g.minPlayers}-${g.maxPlayers} người`}
                      </Badge>
                      <Badge bg="light" text="dark">
                        {`${g.estimatedMinutes} phút`}
                      </Badge>
                      {g.hasHiddenInfo ? (
                        <Badge bg="light" text="dark">
                          Thông tin ẩn
                        </Badge>
                      ) : null}
                      {g.supportsBots ? (
                        <Badge bg="light" text="dark">
                          Có máy
                        </Badge>
                      ) : null}
                    </div>
                    <div className="text-accent d-inline-flex align-items-center gap-1 mt-1">
                      Xem chi tiết
                      <Icon name="arrowRight" size={16} />
                    </div>
                  </div>
                </div>
              </Link>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
