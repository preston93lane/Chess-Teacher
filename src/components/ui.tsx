import { createPortal } from 'react-dom';
import { useEffect, type ReactNode } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import { back } from '../lib/router';
import { CLASS_INFO, type MoveClass } from '../lib/coach/explain';

export function Button({
  children,
  variant = 'primary',
  size,
  icon,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'lg';
  icon?: ReactNode;
}) {
  return (
    <button className={`btn btn-${variant}${size ? ` btn-${size}` : ''} ${className}`} {...rest}>
      {icon}
      {children && <span>{children}</span>}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button className={`icon-btn ${className}`} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}

export function Header({
  title,
  backTo,
  actions,
  sub,
}: {
  title: ReactNode;
  backTo?: string | true;
  actions?: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <header className="page-header">
      {backTo && (
        <IconButton label="Back" onClick={() => back(typeof backTo === 'string' ? backTo : '/')} className="back-btn">
          <ChevronLeft size={22} />
        </IconButton>
      )}
      <div className="page-header-title">
        <h1>{title}</h1>
        {sub && <p className="page-header-sub">{sub}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  // Portal to <body>: the scrolling main area is its own stacking context,
  // and a sheet must cover the tab bar.
  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className={`sheet${wide ? ' sheet-wide' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="sheet-head">
          {title && <h2>{title}</h2>}
          <IconButton label="Close" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? 'is-on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="toggle-row">
      <span>
        <span className="toggle-label">{label}</span>
        {hint && <span className="toggle-hint">{hint}</span>}
      </span>
      <input type="checkbox" className="toggle" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function Glyph({ cls, size = 'md' }: { cls: MoveClass; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const info = CLASS_INFO[cls];
  return (
    <span className={`glyph glyph-${size} tone-${info.tone}`} aria-label={info.label} title={info.label}>
      {info.glyph}
    </span>
  );
}

export function Meter({ value, max = 100, tone }: { value: number; max?: number; tone?: string }) {
  return (
    <div className="meter" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={`meter-fill${tone ? ` tone-bg-${tone}` : ''}`} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="spinner-wrap" role="status">
      <span className="spinner" />
      {label && <span>{label}</span>}
    </span>
  );
}

export function Section({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`section ${className}`}>
      {(title || action) && (
        <div className="section-head">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
