import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../state/ToastContext';
import { Icon } from '../components/Icon';

export function ConnectPage() {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const origin = window.location.origin;

  const copyOrigin = (): void => {
    navigator.clipboard.writeText(origin).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
        toast.success('Đã sao chép địa chỉ.');
      },
      () => toast.warning('Không sao chép được.'),
    );
  };

  return (
    <div className="container-bh py-4">
      <header className="mb-4">
        <div className="bh-eyebrow">Kết nối</div>
        <h1 className="mt-1 mb-2">Chơi cùng nhau qua mạng</h1>
        <p className="bh-muted mb-0" style={{ maxWidth: '60ch' }}>
          BoardHub chạy ngay trên máy của bạn, bạn bè vào chơi qua cùng mạng LAN hoặc qua Tailscale,
          không cần máy chủ đám mây.
        </p>
      </header>

      <div className="d-flex flex-column gap-4">
        <section className="bh-panel">
          <div className="bh-panel-head">Địa chỉ của bạn</div>
          <div className="bh-panel-body">
            <div className="d-flex align-items-center flex-wrap gap-2">
              <code className="bh-code-pill" style={{ wordBreak: 'break-all' }}>
                {origin}
              </code>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                onClick={copyOrigin}
              >
                <Icon name={copied ? 'check' : 'copy'} size={16} />
                <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
            <p className="bh-muted mb-0 mt-2">
              Bạn bè trong cùng mạng có thể mở địa chỉ này.
            </p>
          </div>
        </section>

        <section className="bh-panel">
          <div className="bh-panel-head">Chơi trong cùng mạng LAN</div>
          <div className="bh-panel-body">
            <ol className="list-unstyled d-flex flex-column gap-3 mb-0">
              <li className="d-flex align-items-start gap-3">
                <span className="bh-step-num flex-shrink-0">1</span>
                <div>
                  Trên máy chủ, chạy <code>pnpm dev</code>.
                </div>
              </li>
              <li className="d-flex align-items-start gap-3">
                <span className="bh-step-num flex-shrink-0">2</span>
                <div>
                  Tìm địa chỉ IP của máy chủ: trên Windows mở Command Prompt gõ <code>ipconfig</code>{' '}
                  và tìm dòng IPv4 (ví dụ 192.168.1.25).
                </div>
              </li>
              <li className="d-flex align-items-start gap-3">
                <span className="bh-step-num flex-shrink-0">3</span>
                <div>
                  Trên máy hoặc điện thoại khác cùng wifi, mở trình duyệt vào{' '}
                  <code style={{ wordBreak: 'break-all' }}>{'http://<IP>:5173'}</code>.
                </div>
              </li>
              <li className="d-flex align-items-start gap-3">
                <span className="bh-step-num flex-shrink-0">4</span>
                <div>
                  Đăng nhập hoặc chơi khách, vào Sảnh rồi nhập mã bàn 4 ký tự để vào bàn của bạn.
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="bh-panel">
          <div className="bh-panel-head">Chơi từ xa qua Tailscale</div>
          <div className="bh-panel-body">
            <ol className="list-unstyled d-flex flex-column gap-3 mb-0">
              <li className="d-flex align-items-start gap-3">
                <span className="bh-step-num flex-shrink-0">1</span>
                <div>Cài Tailscale trên cả hai máy và đăng nhập cùng tài khoản.</div>
              </li>
              <li className="d-flex align-items-start gap-3">
                <span className="bh-step-num flex-shrink-0">2</span>
                <div>
                  Lấy địa chỉ Tailscale của máy chủ (dạng 100.x.y.z) trong app Tailscale.
                </div>
              </li>
              <li className="d-flex align-items-start gap-3">
                <span className="bh-step-num flex-shrink-0">3</span>
                <div>
                  Mở <code style={{ wordBreak: 'break-all' }}>{'http://100.x.y.z:5173'}</code> trên
                  máy bạn bè.
                </div>
              </li>
            </ol>
            <p className="bh-muted mb-0 mt-3">
              Tailscale cho phép chơi ngoài mạng LAN mà vẫn an toàn.
            </p>
          </div>
        </section>

        <hr className="bh-divider" />

        <div className="text-center">
          <p className="bh-muted mb-3">Sẵn sàng rồi? Mời bạn bè và bắt đầu chơi.</p>
          <Link to="/play" className="btn btn-primary d-inline-flex align-items-center gap-2">
            <Icon name="play" size={18} />
            Vào sảnh chơi
          </Link>
        </div>
      </div>
    </div>
  );
}
