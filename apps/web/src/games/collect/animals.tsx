import { forwardRef, type CSSProperties } from 'react';
import { OverlayTrigger, Popover } from 'react-bootstrap';
import { setMultiplier, type Species } from '@boardhub/engine';

export const SPECIES_COLOR: Record<Species, string> = {
  rabbit: '#8a94a6',
  otter: '#4f7d8c',
  fox: '#c96a33',
  owl: '#6f5f93',
  deer: '#6f8a45',
  hedgehog: '#9a7350',
  wolf: '#59636e',
  bear: '#6b4a32',
};

export const SPECIES_DESC: Record<Species, string> = {
  rabbit: 'Bầy thỏ đông đúc, dễ gom nhưng giá trị thấp.',
  otter: 'Rái cá tinh nghịch hay đi theo đàn ven suối.',
  fox: 'Cáo lanh lợi, giá trị tầm trung khá ổn.',
  owl: 'Cú thông thái, ghi điểm đều tay.',
  deer: 'Hươu hiền lành dạo bước giữa rừng thưa.',
  hedgehog: 'Nhím gai góc, hiếm hơn nên đáng giá hơn.',
  wolf: 'Sói săn theo bầy, điểm số cao.',
  bear: 'Gấu chúa tể, hiếm nhất và giá trị nhất.',
};

/** Simple original flat animal silhouettes. fill follows currentColor. */
function glyph(species: Species) {
  switch (species) {
    case 'rabbit':
      return (
        <>
          <rect x="22" y="6" width="7" height="26" rx="3.5" />
          <rect x="35" y="6" width="7" height="26" rx="3.5" />
          <circle cx="32" cy="42" r="16" />
        </>
      );
    case 'otter':
      return (
        <>
          <circle cx="20" cy="26" r="9" />
          <ellipse cx="38" cy="40" rx="18" ry="12" />
        </>
      );
    case 'fox':
      return (
        <>
          <path d="M16 14 L26 30 L16 30 Z" />
          <path d="M48 14 L38 30 L48 30 Z" />
          <path d="M14 26 L50 26 L32 56 Z" />
        </>
      );
    case 'owl':
      return (
        <>
          <ellipse cx="32" cy="34" rx="18" ry="20" />
          <circle cx="25" cy="28" r="6" fill="#fff" />
          <circle cx="39" cy="28" r="6" fill="#fff" />
          <path d="M32 34 L28 40 L36 40 Z" fill="#fff" />
        </>
      );
    case 'deer':
      return (
        <>
          <path d="M20 6 L20 20 M20 12 L12 8 M26 6 L26 20 M26 12 L34 8" stroke="currentColor" strokeWidth="3" fill="none" />
          <path d="M44 6 L44 20 M44 12 L52 8 M38 6 L38 20" stroke="currentColor" strokeWidth="3" fill="none" />
          <ellipse cx="32" cy="40" rx="13" ry="18" />
        </>
      );
    case 'hedgehog':
      return (
        <>
          <path d="M8 44 L16 24 L22 42 L30 20 L38 42 L46 24 L56 44 Z" />
          <circle cx="50" cy="44" r="8" />
        </>
      );
    case 'wolf':
      return (
        <>
          <path d="M16 12 L24 28 L16 30 Z" />
          <path d="M48 12 L40 28 L48 30 Z" />
          <path d="M14 26 L50 26 L42 50 L32 44 L22 50 Z" />
        </>
      );
    case 'bear':
      return (
        <>
          <circle cx="18" cy="18" r="9" />
          <circle cx="46" cy="18" r="9" />
          <circle cx="32" cy="38" r="20" />
          <circle cx="32" cy="42" r="7" fill="#fff" />
        </>
      );
    default:
      return null;
  }
}

export function AnimalGlyph({ species, size = 40 }: { species: Species; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ color: SPECIES_COLOR[species] }} aria-hidden="true" fill="currentColor">
      {glyph(species)}
    </svg>
  );
}

interface CollectCardProps {
  species: Species;
  name: string;
  base: number;
  count?: number;
  selected?: boolean;
  disabled?: boolean;
  dealIndex?: number;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export const CollectCard = forwardRef<HTMLButtonElement, CollectCardProps>(function CollectCard(
  { species, name, base, count, selected, disabled, dealIndex = 0, onClick, size = 'md', ...rest },
  ref,
) {
  const style: CSSProperties = { animationDelay: `${Math.min(dealIndex, 10) * 35}ms`, borderColor: SPECIES_COLOR[species] };
  return (
    <button
      ref={ref}
      type="button"
      className={`ct-card ${size}${selected ? ' sel' : ''}`}
      style={style}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      <span className="ct-band" style={{ backgroundColor: SPECIES_COLOR[species] }}>
        <span className="ct-val">{base}</span>
        {count && count > 1 ? <span className="ct-count">x{count}</span> : null}
      </span>
      <span className="ct-glyph">
        <AnimalGlyph species={species} size={size === 'sm' ? 30 : 40} />
      </span>
      <span className="ct-name">{name}</span>
    </button>
  );
});

export function cardPopover(species: Species, name: string, base: number): JSX.Element {
  const sizes = [3, 4, 5, 6];
  return (
    <Popover id={`pop-${species}`}>
      <Popover.Header className="d-flex align-items-center gap-2">
        <AnimalGlyph species={species} size={22} /> {name}
      </Popover.Header>
      <Popover.Body>
        <div className="mb-1">{SPECIES_DESC[species]}</div>
        <div className="bh-muted mb-2" style={{ fontSize: 13 }}>
          Giá trị gốc: {base} điểm mỗi lá.
        </div>
        <div className="d-flex gap-2 flex-wrap" style={{ fontSize: 12 }}>
          {sizes.map((s) => (
            <span key={s} className="bh-code-pill">
              {s} lá: {base * setMultiplier(s)}
            </span>
          ))}
        </div>
      </Popover.Body>
    </Popover>
  );
}

export function withTip(species: Species, name: string, base: number, child: JSX.Element): JSX.Element {
  return (
    <OverlayTrigger trigger={['hover', 'focus']} placement="top" delay={{ show: 120, hide: 60 }} overlay={cardPopover(species, name, base)}>
      {child}
    </OverlayTrigger>
  );
}
