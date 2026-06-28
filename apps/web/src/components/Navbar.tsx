import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../state/ThemeContext';
import { Avatar } from './Avatar';
import { Icon } from './Icon';

const LINKS = [
  { to: '/', label: 'Trang chủ', end: true },
  { to: '/games', label: 'Trò chơi', end: false },
  { to: '/play', label: 'Sảnh chơi', end: false },
  { to: '/connect', label: 'Kết nối', end: false },
];

export function Navbar() {
  const { user, isAuthed, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();

  const close = (): void => setOpen(false);

  const handleLogout = (): void => {
    logout();
    setMenu(false);
    navigate('/');
  };

  return (
    <header className="bh-navbar">
      <div className="container-bh d-flex align-items-center justify-content-between" style={{ height: 56 }}>
        <Link to="/" className="bh-brand" onClick={close}>
          <span className="bh-brand-mark">
            <span />
            <span />
            <span />
            <span />
          </span>
          BoardHub
        </Link>

        <nav className="d-none d-lg-flex align-items-center gap-1">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="bh-navlink">
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary border-0"
            onClick={toggle}
            aria-label={theme === 'light' ? 'Chuyển nền tối' : 'Chuyển nền sáng'}
            title={theme === 'light' ? 'Nền tối' : 'Nền sáng'}
          >
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
          </button>

          {isAuthed && user ? (
            <div className="position-relative d-none d-lg-block">
              <button
                type="button"
                className="btn btn-sm d-flex align-items-center gap-2 border"
                onClick={() => setMenu((m) => !m)}
                style={{ borderRadius: 999 }}
              >
                <Avatar name={user.displayName} color={user.avatarColor} size={24} />
                <span className="fw-semibold" style={{ maxWidth: 120 }}>
                  {user.displayName}
                </span>
              </button>
              {menu && (
                <>
                  <div className="position-fixed top-0 start-0 w-100 h-100" style={{ zIndex: 1 }} onClick={() => setMenu(false)} />
                  <div className="dropdown-menu show mt-2 end-0" style={{ position: 'absolute', right: 0, zIndex: 2 }}>
                    <Link className="dropdown-item d-flex align-items-center gap-2" to="/me" onClick={() => setMenu(false)}>
                      <Icon name="user" size={16} /> Hồ sơ
                    </Link>
                    <Link className="dropdown-item d-flex align-items-center gap-2" to="/settings" onClick={() => setMenu(false)}>
                      <Icon name="gear" size={16} /> Cài đặt
                    </Link>
                    <div className="dropdown-divider" />
                    <button className="dropdown-item d-flex align-items-center gap-2 text-danger" onClick={handleLogout}>
                      <Icon name="logout" size={16} /> Đăng xuất
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm d-none d-lg-inline-flex">
              Đăng nhập
            </Link>
          )}

          <button
            type="button"
            className="btn btn-sm btn-outline-secondary border-0 d-lg-none"
            onClick={() => setOpen((o) => !o)}
            aria-label="Mở menu"
          >
            <Icon name={open ? 'close' : 'menu'} size={20} />
          </button>
        </div>
      </div>

      {open && (
        <div className="d-lg-none border-top" style={{ backgroundColor: 'var(--bh-surface)' }}>
          <div className="container-bh py-2 d-flex flex-column gap-1">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className="bh-navlink" onClick={close}>
                {l.label}
              </NavLink>
            ))}
            <hr className="bh-divider my-2" />
            {isAuthed && user ? (
              <>
                <Link className="bh-navlink d-flex align-items-center gap-2" to="/me" onClick={close}>
                  <Avatar name={user.displayName} color={user.avatarColor} size={22} /> {user.displayName}
                </Link>
                <Link className="bh-navlink" to="/settings" onClick={close}>
                  Cài đặt
                </Link>
                <button className="bh-navlink text-start text-danger border-0 bg-transparent" onClick={handleLogout}>
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm" onClick={close}>
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
