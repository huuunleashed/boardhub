import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Button, Row, Col } from 'react-bootstrap';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../state/ThemeContext';
import { useToast } from '../state/ToastContext';
import { api, ApiError } from '../lib/api';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { AVATAR_COLORS, DISPLAY_NAME_MAX } from '@boardhub/shared';

const BIO_MAX = 280;

export function SettingsPage() {
  const { user, applyUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  // Hooks must run unconditionally, so seed them from the user with safe fallbacks.
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor ?? AVATAR_COLORS[0]);
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <div className="container-bh py-4" style={{ maxWidth: 720 }}>
        <p className="bh-muted">
          Bạn cần đăng nhập để xem trang này. <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    );
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await api.updateProfile({ displayName, bio, avatarColor });
      applyUser(updated);
      toast.success('Đã lưu hồ sơ.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không lưu được.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container-bh py-4" style={{ maxWidth: 720 }}>
      <h1 className="h3 mb-4">Cài đặt</h1>

      <section className="bh-panel mb-4">
        <div className="bh-panel-head">Hồ sơ</div>
        <div className="bh-panel-body">
          <div className="d-flex align-items-center gap-3 mb-3">
            <Avatar name={displayName} color={avatarColor} size={56} />
            <span className="fw-semibold text-truncate">{displayName || 'Chưa đặt tên'}</span>
          </div>

          <Form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <Form.Group className="mb-3" controlId="settings-display-name">
              <Form.Label>Tên hiển thị</Form.Label>
              <Form.Control
                type="text"
                maxLength={DISPLAY_NAME_MAX}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={saving}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="settings-bio">
              <Form.Label>Giới thiệu</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                maxLength={BIO_MAX}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={saving}
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Màu đại diện</Form.Label>
              <div className="d-flex flex-wrap gap-2">
                {AVATAR_COLORS.map((color) => {
                  const selected = color === avatarColor;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAvatarColor(color)}
                      aria-label={`Chọn màu ${color}`}
                      aria-pressed={selected}
                      title={color}
                      style={{
                        width: 28,
                        height: 28,
                        padding: 0,
                        borderRadius: '50%',
                        backgroundColor: color,
                        border: '1px solid var(--bh-border)',
                        cursor: 'pointer',
                        boxShadow: selected ? '0 0 0 3px var(--bh-accent)' : 'none',
                      }}
                    />
                  );
                })}
              </div>
            </Form.Group>

            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </Form>
        </div>
      </section>

      <section className="bh-panel mb-4">
        <div className="bh-panel-head">Giao diện</div>
        <div className="bh-panel-body">
          <Row className="g-2">
            <Col xs={6}>
              <Button
                type="button"
                variant={theme === 'light' ? 'primary' : 'outline-secondary'}
                className="w-100 d-flex align-items-center justify-content-center gap-2"
                onClick={() => setTheme('light')}
                aria-pressed={theme === 'light'}
              >
                <Icon name="sun" size={18} />
                Sáng
              </Button>
            </Col>
            <Col xs={6}>
              <Button
                type="button"
                variant={theme === 'dark' ? 'primary' : 'outline-secondary'}
                className="w-100 d-flex align-items-center justify-content-center gap-2"
                onClick={() => setTheme('dark')}
                aria-pressed={theme === 'dark'}
              >
                <Icon name="moon" size={18} />
                Tối
              </Button>
            </Col>
          </Row>
        </div>
      </section>

      <section className="bh-panel">
        <div className="bh-panel-head">Tài khoản</div>
        <div className="bh-panel-body">
          <p className="bh-muted mb-2">@{user.username}</p>
          {user.isGuest && (
            <p className="bh-muted mb-0">
              Bạn đang chơi với tư cách khách. Tạo tài khoản để lưu tiến trình lâu dài.
            </p>
          )}

          <hr className="bh-divider" />

          <Button
            type="button"
            variant="outline-danger"
            className="d-flex align-items-center gap-2"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            <Icon name="logout" size={18} />
            Đăng xuất
          </Button>
        </div>
      </section>
    </div>
  );
}
