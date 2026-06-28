import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';

export function NotFoundPage() {
  return (
    <div className="container-bh py-5 text-center">
      <div
        style={{
          fontSize: 'clamp(4rem, 16vw, 7rem)',
          fontWeight: 800,
          lineHeight: 1,
          color: 'var(--bh-muted)',
        }}
      >
        404
      </div>
      <h2 className="mt-3">Không tìm thấy trang</h2>
      <p className="bh-muted">Trang bạn tìm không tồn tại hoặc đã được chuyển đi.</p>
      <Link to="/" className="btn btn-primary d-inline-flex align-items-center gap-2">
        <Icon name="home" size={18} />
        Về trang chủ
      </Link>
    </div>
  );
}
