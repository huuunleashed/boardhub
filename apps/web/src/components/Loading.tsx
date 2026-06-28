import { Spinner } from 'react-bootstrap';

export function Loading({ label = 'Đang tải...' }: { label?: string }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5 gap-2 bh-muted">
      <Spinner animation="border" role="status" />
      <span>{label}</span>
    </div>
  );
}
