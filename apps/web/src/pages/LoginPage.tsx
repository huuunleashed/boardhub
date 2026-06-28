import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Button, Spinner } from 'react-bootstrap';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { ApiError } from '../lib/api';
import { Icon } from '../components/Icon';

/** Only follow same origin, absolute paths so a crafted link cannot redirect away. */
function resolveNext(value: string | null): string {
  if (value && value.startsWith('/') && !value.startsWith('//')) return value;
  return '/play';
}

export function LoginPage() {
  const { isAuthed, login, guestLogin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const rawNext = params.get('next');
  const next = resolveNext(rawNext);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [guesting, setGuesting] = useState(false);
  const busy = submitting || guesting;

  useEffect(() => {
    if (isAuthed) navigate(next, { replace: true });
  }, [isAuthed, next, navigate]);

  async function submitLogin() {
    if (busy) return;
    setSubmitting(true);
    try {
      await login(username, password);
      navigate(next, { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Đăng nhập thất bại.');
    } finally {
      setSubmitting(false);
    }
  }

  async function playAsGuest() {
    if (busy) return;
    setGuesting(true);
    try {
      await guestLogin();
      navigate(next, { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Không vào được chế độ khách.');
    } finally {
      setGuesting(false);
    }
  }

  const registerHref =
    rawNext && next !== '/play' ? `/register?next=${encodeURIComponent(next)}` : '/register';

  return (
    <div className="container-bh py-5">
      <div className="mx-auto" style={{ maxWidth: 420 }}>
        <div className="bh-panel">
          <div className="bh-panel-head d-flex align-items-center gap-2">
            <Icon name="user" size={18} style={{ color: 'var(--bh-accent)' }} />
            <span>Đăng nhập</span>
          </div>
          <div className="bh-panel-body">
            <Form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void submitLogin();
              }}
            >
              <Form.Group className="mb-3" controlId="login-username">
                <Form.Label>Tên đăng nhập</Form.Label>
                <Form.Control
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={busy}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="login-password">
                <Form.Label>Mật khẩu</Form.Label>
                <Form.Control
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                  required
                />
              </Form.Group>

              <Button type="submit" variant="primary" className="w-100" disabled={busy}>
                {submitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Đang đăng nhập...
                  </>
                ) : (
                  'Đăng nhập'
                )}
              </Button>
            </Form>

            <hr className="bh-divider" />

            <Button
              type="button"
              variant="outline-secondary"
              className="w-100"
              onClick={() => void playAsGuest()}
              disabled={busy}
            >
              {guesting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Đang vào...
                </>
              ) : (
                'Chơi với tư cách khách'
              )}
            </Button>

            <p className="text-center bh-muted mt-3 mb-0">
              Chưa có tài khoản? <Link to={registerHref}>Đăng ký</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
