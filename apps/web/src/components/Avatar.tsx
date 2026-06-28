import { initials } from '../lib/format';

interface AvatarProps {
  name: string;
  color: string;
  size?: number;
  square?: boolean;
  title?: string;
}

export function Avatar({ name, color, size = 36, square = false, title }: AvatarProps) {
  return (
    <span
      className={`bh-avatar${square ? ' square' : ''}`}
      style={{ width: size, height: size, backgroundColor: color, fontSize: Math.round(size * 0.4) }}
      title={title ?? name}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
