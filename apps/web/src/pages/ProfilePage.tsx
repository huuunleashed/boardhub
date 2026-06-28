/**
 * Player profile page (routes '/profile/:id' and '/me'). Shows a player's
 * identity, aggregate stats, a per game breakdown and the recent match
 * history. On '/me' it resolves to the logged in user's own profile.
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { api, ApiError } from '../lib/api';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Loading } from '../components/Loading';
import { timeAgo, formatDateTime } from '../lib/format';
import type { MatchRecord, UserProfile } from '@boardhub/shared';
import { Row, Col, Badge } from 'react-bootstrap';

type ProfileData = { user: UserProfile; matches: MatchRecord[] };

const GAME_LABELS: Record<string, string> = {
  oxono: 'Oxono',
  collect: 'Collect',
};

function gameLabel(id: string): string {
  return GAME_LABELS[id] ?? id;
}

const PILL_STYLE = {
  background: 'var(--bh-surface-2)',
  color: 'var(--bh-muted)',
  border: '1px solid var(--bh-border)',
  fontWeight: 600,
};

const RESULT_META: Record<
  MatchRecord['result'],
  { label: string; bg: string; color: string; border?: string }
> = {
  win: { label: 'Thắng', bg: 'var(--bh-success)', color: '#fff' },
  loss: { label: 'Thua', bg: 'var(--bh-danger)', color: '#fff' },
  draw: {
    label: 'Hòa',
    bg: 'var(--bh-surface-2)',
    color: 'var(--bh-ink-soft)',
    border: '1px solid var(--bh-border)',
  },
};

export function ProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const targetId = id ?? user?.id;

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!targetId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setNotFound(false);
    api
      .getProfile(targetId)
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setData(null);
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true); // người chơi không tồn tại
        } else {
          setNotFound(true); // mọi lỗi khác cũng coi như không tìm thấy
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [targetId]);

  if (!targetId) {
    return (
      <div className="container-bh py-4">
        <div className="text-center py-5">
          <p className="bh-muted mb-3">Vui lòng đăng nhập để xem hồ sơ của bạn.</p>
          <Link to="/login" className="btn btn-outline-secondary">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-bh py-4">
        <Loading />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="container-bh py-4">
        <div className="text-center py-5">
          <p className="bh-muted mb-3">Không tìm thấy người chơi.</p>
          <Link to="/" className="btn btn-outline-secondary">
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const { user: profile, matches } = data;
  const { stats } = profile;
  const isOwn = user?.id === profile.id;
  const winRate = Math.round((stats.gamesWon / stats.gamesPlayed) * 100) || 0;
  const byGameEntries = Object.entries(stats.byGame);

  const statCards: { label: string; value: string | number }[] = [
    { label: 'Trận đã chơi', value: stats.gamesPlayed },
    { label: 'Trận thắng', value: stats.gamesWon },
    { label: 'Tỷ lệ thắng', value: `${winRate}%` },
    { label: 'Số game', value: Object.keys(stats.byGame).length },
  ];

  return (
    <div className="container-bh py-4">
      <div className="bh-panel">
        <div className="bh-panel-body">
          <div className="d-flex align-items-start gap-3 flex-wrap">
            <Avatar name={profile.displayName} color={profile.avatarColor} size={64} />
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h2 className="mb-0 text-truncate">{profile.displayName}</h2>
                {profile.isGuest && (
                  <Badge bg="" style={PILL_STYLE}>
                    Khách
                  </Badge>
                )}
              </div>
              <div className="bh-muted">@{profile.username}</div>
              <div className="bh-muted small mt-1">
                Tham gia {formatDateTime(profile.createdAt)}
              </div>
            </div>
            {isOwn && (
              <Link
                to="/settings"
                className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
              >
                <Icon name="gear" size={16} />
                Chỉnh sửa hồ sơ
              </Link>
            )}
          </div>
          {profile.bio && <p className="mb-0 mt-3">{profile.bio}</p>}
        </div>
      </div>

      <Row className="g-3 mt-1">
        {statCards.map((card) => (
          <Col xs={6} md={3} key={card.label}>
            <div className="bh-panel h-100">
              <div className="bh-panel-body text-center">
                <div style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}>
                  {card.value}
                </div>
                <div className="bh-muted small mt-1">{card.label}</div>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      <div className="bh-panel mt-4">
        <div className="bh-panel-head">Theo trò chơi</div>
        <div className="bh-panel-body">
          {byGameEntries.length === 0 ? (
            <p className="bh-muted mb-0">Chưa có dữ liệu.</p>
          ) : (
            <div className="d-flex flex-column gap-2">
              {byGameEntries.map(([gameId, rec]) => (
                <div key={gameId} className="bh-seat">
                  <div className="flex-grow-1 fw-semibold text-truncate">{gameLabel(gameId)}</div>
                  <div className="bh-muted" style={{ flex: '0 0 auto' }}>
                    {rec.won}/{rec.played} thắng
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bh-panel mt-4">
        <div className="bh-panel-head">Lịch sử gần đây</div>
        <div className="bh-panel-body">
          {matches.length === 0 ? (
            <p className="bh-muted mb-0">Chưa có trận nào.</p>
          ) : (
            <div className="d-flex flex-column gap-2">
              {matches.map((match) => {
                const meta = RESULT_META[match.result];
                const opponents =
                  match.opponents.length > 0 ? match.opponents.join(', ') : 'Máy';
                return (
                  <div key={match.id} className="bh-seat">
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="fw-semibold text-truncate">{match.gameName}</div>
                      <div className="bh-muted small text-truncate">Đối thủ: {opponents}</div>
                    </div>
                    <div
                      className="d-flex flex-column align-items-end gap-1"
                      style={{ flex: '0 0 auto' }}
                    >
                      <Badge
                        bg=""
                        style={{ background: meta.bg, color: meta.color, border: meta.border }}
                      >
                        {meta.label}
                      </Badge>
                      <span className="bh-muted small">{timeAgo(match.playedAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
