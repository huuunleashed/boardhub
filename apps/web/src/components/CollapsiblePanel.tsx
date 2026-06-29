import { useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from './Icon';

interface Props {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  fill?: boolean;
  style?: CSSProperties;
}

/** A panel whose body can be collapsed by clicking the header. */
export function CollapsiblePanel({ title, children, defaultOpen = true, fill = false, style }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`bh-panel${fill && open ? ' d-flex flex-column' : ''}`} style={open ? style : undefined}>
      <button
        type="button"
        className="bh-panel-head d-flex justify-content-between align-items-center w-100 border-0 bg-transparent text-start"
        style={{ cursor: 'pointer' }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <Icon name="chevron" size={16} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {open && children}
    </div>
  );
}
