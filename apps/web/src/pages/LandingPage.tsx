/**
 * Public landing page (route '/'). Introduces BoardHub, lists featured games,
 * explains how it works, highlights key features and ends with a call to action.
 */
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../state/AuthContext';
import { api, ApiError } from '../lib/api';
import { Icon } from '../components/Icon';
import { Loading } from '../components/Loading';
import type { GameCatalogEntry } from '@boardhub/shared';
import { Row, Col, Badge } from 'react-bootstrap';

const META_BADGE_STYLE = {
  backgroundColor: 'var(--bh-surface-2)',
  color: 'var(--bh-ink-soft)',
  border: '1px solid var(--bh-border)',
  fontWeight: 600,
};

const STEPS = [
  {
    num: 1,
    title: 'Tạo bàn hoặc vào bằng mã',
    desc: 'Mở một bàn mới cho trò bạn thích, hoặc nhập mã bàn để vào ngay.',
  },
  {
    num: 2,
    title: 'Mời bạn qua liên kết hoặc mã bàn',
    desc: 'Gửi liên kết hoặc mã bàn cho bạn bè, họ tham gia chỉ trong vài giây.',
  },
  {
    num: 3,
    title: 'Chơi trực tiếp trên trình duyệt',
    desc: 'Không cần cài đặt, mọi nước đi được đồng bộ theo thời gian thực.',
  },
];

const FEATURES = [
  {
    icon: 'link',
    title: 'Chơi qua mạng LAN hoặc Tailscale',
    desc: 'Tự host trên máy của bạn rồi kết nối qua LAN hay Tailscale đều được.',
  },
  {
    icon: 'users',
    title: 'Mượt trên PC và điện thoại',
    desc: 'Giao diện gọn nhẹ, hiển thị tốt trên cả màn hình lớn lẫn điện thoại.',
  },
  {
    icon: 'robot',
    title: 'Có máy chơi cùng',
    desc: 'Thiếu người vẫn chơi được nhờ đối thủ máy cho một số trò.',
  },
  {
    icon: 'info',
    title: 'Mã nguồn mở, tự host',
    desc: 'Dữ liệu nằm trên máy của bạn, minh bạch và hoàn toàn miễn phí.',
  },
] as const;

export function LandingPage() {
  const { isAuthed } = useAuth();
  const navigate = useNavigate();

  const [games, setGames] = useState<GameCatalogEntry[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState<string | null>(null);

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
        setGamesError(message);
      })
      .finally(() => {
        if (active) setGamesLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const goPlay = (): void => {
    navigate(isAuthed ? '/play' : '/login?next=/play');
  };

  return (
    <>
      <section className="bh-hero">
        <div className="container-bh">
          <div style={{ maxWidth: '46rem' }}>
            <div className="bh-eyebrow">BoardHub</div>
            <h1 className="mt-2 mb-3">Chơi board game cùng bạn bè, hoàn toàn miễn phí</h1>
            <p className="lead bh-muted mb-0">
              BoardHub là sảnh chơi board game tự host, miễn phí cho người Việt. Mọi thứ chạy
              ngay trong trình duyệt trên cả máy tính lẫn điện thoại, không cần cài đặt.
            </p>
            <div className="d-flex flex-wrap gap-2 mt-4">
              <button
                type="button"
                className="btn btn-primary btn-lg d-inline-flex align-items-center gap-2"
                onClick={goPlay}
              >
                <Icon name="play" size={18} />
                Chơi ngay
              </button>
              <Link
                to="/games"
                className="btn btn-outline-secondary btn-lg d-inline-flex align-items-center gap-2"
              >
                Khám phá trò chơi
                <Icon name="arrowRight" size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bh-section">
        <div className="container-bh">
          <h2 className="mb-1">Trò chơi</h2>
          <p className="bh-muted">Chọn một trò để xem luật chơi và bắt đầu một bàn mới.</p>
          {gamesLoading ? (
            <Loading label="Đang tải trò chơi..." />
          ) : gamesError ? (
            <p className="bh-muted mb-0">{gamesError}</p>
          ) : games.length === 0 ? (
            <p className="bh-muted mb-0">Chưa có trò chơi nào.</p>
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
                        {g.name ? (
                          <span
                            style={{
                              fontSize: '2.5rem',
                              fontWeight: 750,
                              lineHeight: 1,
                              color: 'var(--bh-accent)',
                            }}
                          >
                            {g.name.charAt(0).toUpperCase()}
                          </span>
                        ) : (
                          <Icon name="dice" size={40} />
                        )}
                      </div>
                      <div className="p-3 d-flex flex-column gap-2">
                        <h3 className="mb-0">{g.name}</h3>
                        <p className="bh-muted mb-1">{g.tagline}</p>
                        <div className="d-flex flex-wrap gap-1">
                          {[
                            `${g.minPlayers}-${g.maxPlayers} người`,
                            `${g.estimatedMinutes} phút`,
                            ...(g.supportsBots ? ['Có máy'] : []),
                          ].map((label) => (
                            <Badge key={label} bg="" style={META_BADGE_STYLE}>
                              {label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                </Col>
              ))}
            </Row>
          )}
        </div>
      </section>

      <section className="bh-section">
        <div className="container-bh">
          <h2 className="mb-3">Cách hoạt động</h2>
          <Row className="g-4">
            {STEPS.map((s) => (
              <Col md={4} key={s.num}>
                <div className="d-flex flex-column gap-2">
                  <span className="bh-step-num">{s.num}</span>
                  <h3 className="mb-0">{s.title}</h3>
                  <p className="bh-muted mb-0">{s.desc}</p>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      <section className="bh-section">
        <div className="container-bh">
          <h2 className="mb-3">Vì sao chọn BoardHub</h2>
          <Row className="g-3">
            {FEATURES.map((f) => (
              <Col sm={6} lg={3} key={f.title}>
                <div className="bh-feature d-flex flex-column gap-2">
                  <span className="text-accent">
                    <Icon name={f.icon} size={22} />
                  </span>
                  <h3 className="mb-0">{f.title}</h3>
                  <p className="bh-muted mb-0">{f.desc}</p>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      <section className="bh-section">
        <div className="container-bh">
          <div
            className="text-center p-4 p-md-5"
            style={{
              backgroundColor: 'var(--bh-surface)',
              border: '1px solid var(--bh-border)',
              borderRadius: 'var(--bh-radius-lg)',
            }}
          >
            <h2 className="mb-2">Sẵn sàng chơi chưa?</h2>
            <p className="bh-muted mb-3">
              Vào sảnh, tạo bàn và rủ bạn bè cùng chơi ngay bây giờ.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-lg d-inline-flex align-items-center gap-2"
              onClick={goPlay}
            >
              <Icon name="play" size={18} />
              Vào sảnh chơi
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
