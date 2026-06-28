import { Link } from 'react-router-dom';
import { APP_NAME } from '@boardhub/shared';

export function Footer() {
  return (
    <footer className="bh-footer">
      <div className="container-bh py-4 d-flex flex-column flex-md-row justify-content-between gap-2">
        <div>
          <span className="fw-semibold">{APP_NAME}</span>
          <span className="bh-muted"> · Sân chơi board game mở, tự host, miễn phí.</span>
        </div>
        <div className="d-flex gap-3">
          <Link to="/games" className="bh-muted">
            Trò chơi
          </Link>
          <Link to="/connect" className="bh-muted">
            Kết nối
          </Link>
          <a href="https://github.com/huuunleashed/boardhub" target="_blank" rel="noreferrer" className="bh-muted">
            Mã nguồn
          </a>
        </div>
      </div>
    </footer>
  );
}
