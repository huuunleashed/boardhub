import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Button, Spinner } from 'react-bootstrap';
import { USERNAME_MIN, USERNAME_MAX, PASSWORD_MIN } from '@boardhub/shared';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { ApiError } from '../lib/api';
import { Icon } from '../components/Icon';

/** Only follow same origin, absolute paths so a crafted link cannot redirect away. */
function resolveNext(value: string | null): string {
  if (value && value.startsWith('/') && !value.startsWith('//')) return value;
  return '/play';
}

export function RegisterPage() {
  const { isAuthed, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const rawNext = params.get('next');
  const next = resolveNext(rawNext);

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthed) navigate(next, { replace: true });
  }, [isAuthed, next, navigate]);

  async function submitRegister() {
    if (submitting) return;
    if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
      toast.error(`Tên đăng nhập phải từ ${USERNAME_MIN} đến ${USERNAME_MAX} ký tự.`);
      return;
    }
    if (password.length < PASSWORD_MIN) {
      toast.error(`Mật khẩu phải có ít nhất ${PASSWORD_MIN} ký tự.`);
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Mật khẩu nhập lại không khớp.');
      return;
    }
    setSubmitting(true);
    try {
      await register(username, password, displayName || undefined);
      navigate(next, { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Đăng ký thất bại.');
    } finally {
      setSubmitting(false);
    }
  }

  const loginHref =
    rawNext && next !== '/play' ? `/login?next=${encodeURIComponent(next)}` : '/login';

  return (
    <div className="container-bh py-5">
      <div className="mx-auto" style={{ maxWidth: 420 }}>
        <div className="bh-panel">
          <div className="bh-panel-head d-flex align-items-center gap-2">
            <Icon name="user" size={18} style={{ color: 'var(--bh-accent)' }} />
            <span>Tạo tài khoản</span>
          </div>
          <div className="bh-panel-body">
            <Form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void submitRegister();
              }}
            >
              <Form.Group className="mb-3" controlId="register-username">
                <Form.Label>Tên đăng nhập</Form.Label>
                <Form.Control
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={submitting}
                  required
                />
                <Form.Text className="bh-muted">
                  Từ {USERNAME_MIN} đến {USERNAME_MAX} ký tự.
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3" controlId="register-display">
                <Form.Label>Tên hiển thị (không bắt buộc)</Form.Label>
                <Form.Control
                  type="text"
                  autoComplete="nickname"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={submitting}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="register-password">
                <Form.Label>Mật khẩu</Form.Label>
                <Form.Control
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  required
                />
                <Form.Text className="bh-muted">Ít nhất {PASSWORD_MIN} ký tự.</Form.Text>
              </Form.Group>

              <Form.Group className="mb-3" controlId="register-confirm">
                <Form.Label>Nhập lại mật khẩu</Form.Label>
                <Form.Control
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                  required
                />
              </Form.Group>

              <Button type="submit" variant="primary" className="w-100" disabled={submitting}>
                {submitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Đang tạo tài khoản...
                  </>
                ) : (
                  'Tạo tài khoản'
                )}
              </Button>
            </Form>

            <p className="text-center bh-muted mt-3 mb-0">
              Đã có tài khoản? <Link to={loginHref}>Đăng nhập</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
