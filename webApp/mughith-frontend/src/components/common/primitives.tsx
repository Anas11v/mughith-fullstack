import {
  forwardRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { useI18n } from '../../lib/i18n';
import { IconChevronDown } from './Icons';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconEnd?: ReactNode;
  full?: boolean;
  loading?: boolean;
  style?: CSSProperties;
}

const heights: Record<Size, number> = { sm: 32, md: 40, lg: 48 };
const pads: Record<Size, string> = { sm: '0 12px', md: '0 16px', lg: '0 20px' };
const fonts: Record<Size, number> = { sm: 13, md: 14, lg: 15 };

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconEnd,
  children,
  disabled,
  full,
  loading,
  type = 'button',
  style,
  ...rest
}: ButtonProps) {
  const [hover, setHover] = useState(false);

  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: heights[size],
    padding: pads[size],
    borderRadius: 8,
    border: '1px solid transparent',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: fonts[size],
    whiteSpace: 'nowrap',
    transition: 'all 120ms ease',
    userSelect: 'none',
    fontFamily: 'inherit',
    width: full ? '100%' : undefined,
  };

  const variants: Record<Variant, CSSProperties> = {
    primary: { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent-600)' },
    secondary: {
      background: 'var(--panel)',
      color: 'var(--ink)',
      borderColor: 'var(--border-strong)',
    },
    ghost: { background: 'transparent', color: 'var(--ink-2)', borderColor: 'transparent' },
    danger: { background: 'var(--critical)', color: '#fff', borderColor: '#9A0E25' },
    outline: { background: 'transparent', color: 'var(--accent)', borderColor: 'var(--accent)' },
  };

  const hoverStyles: Record<Variant, CSSProperties> = {
    primary: { background: 'var(--accent-600)' },
    secondary: { background: 'var(--panel-2)' },
    ghost: { background: 'var(--panel-2)' },
    danger: { background: '#9A0E25' },
    outline: { background: 'var(--accent-soft)' },
  };

  const disabledState = disabled || loading;

  return (
    <button
      type={type}
      disabled={disabledState}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...base,
        ...variants[variant],
        ...(hover && !disabledState ? hoverStyles[variant] : {}),
        opacity: disabledState ? 0.55 : 1,
        cursor: disabledState ? 'not-allowed' : 'pointer',
        ...style,
      }}
      {...rest}
    >
      {loading ? (
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      ) : (
        icon
      )}
      {children}
      {!loading && iconEnd}
    </button>
  );
}

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  padded?: boolean;
  hover?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Card({ children, style, padded = true, hover = false, onClick, className }: CardProps) {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      className={className}
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-sm)',
        padding: padded ? 18 : 0,
        transition: 'all 140ms ease',
        cursor: onClick ? 'pointer' : 'default',
        ...(hover && h
          ? { borderColor: 'var(--border-strong)', boxShadow: 'var(--shadow-md)' }
          : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

type Tone = 'neutral' | 'critical' | 'serious' | 'moderate' | 'accent' | 'live' | 'success';

const tonePalette: Record<Tone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: 'var(--panel-2)', fg: 'var(--ink-2)', border: 'var(--border)' },
  critical: { bg: 'var(--critical-soft)', fg: 'var(--critical)', border: 'transparent' },
  serious: { bg: 'var(--serious-soft)', fg: 'var(--serious)', border: 'transparent' },
  moderate: { bg: 'var(--moderate-soft)', fg: 'var(--moderate)', border: 'transparent' },
  accent: { bg: 'var(--accent-soft)', fg: 'var(--accent-ink)', border: 'transparent' },
  live: { bg: 'var(--critical-soft)', fg: 'var(--critical)', border: 'transparent' },
  success: { bg: 'var(--accent-soft)', fg: 'var(--accent-ink)', border: 'transparent' },
};

export function Badge({
  tone = 'neutral',
  children,
  dot = false,
  style,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  style?: CSSProperties;
}) {
  const t = tonePalette[tone];
  const animated = tone === 'live' || tone === 'critical';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 9px',
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 600,
        letterSpacing: '0.02em',
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.border}`,
        lineHeight: 1.6,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            background: t.fg,
            animation: animated ? 'blink 1.4s infinite' : undefined,
          }}
        />
      )}
      {children}
    </span>
  );
}

interface InputFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'style' | 'size'> {
  icon?: ReactNode;
  label?: string;
  hint?: string;
  error?: string;
  style?: CSSProperties;
  wrapperStyle?: CSSProperties;
}

export const Input = forwardRef<HTMLInputElement, InputFieldProps>(function Input(
  { icon, label, hint, error, style, wrapperStyle, onFocus, onBlur, ...rest },
  ref,
) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...wrapperStyle }}>
      {label && (
        <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>{label}</label>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--panel)',
          border: `1px solid ${error ? 'var(--critical)' : focus ? 'var(--accent)' : 'var(--border-strong)'}`,
          borderRadius: 8,
          padding: '0 12px',
          height: 42,
          boxShadow: focus ? '0 0 0 3px var(--accent-soft)' : 'none',
          transition: 'all 120ms ease',
        }}
      >
        {icon && <span style={{ color: 'var(--muted)', display: 'flex' }}>{icon}</span>}
        <input
          ref={ref}
          onFocus={(e) => {
            setFocus(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            onBlur?.(e);
          }}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 14,
            color: 'var(--ink)',
            fontFamily: 'inherit',
            height: '100%',
            ...style,
          }}
          {...rest}
        />
      </div>
      {hint && !error && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{hint}</span>}
      {error && <span style={{ fontSize: 12, color: 'var(--critical)' }}>{error}</span>}
    </div>
  );
});

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'style'> {
  label?: string;
  hint?: string;
  options: { value: string; label: string }[];
  style?: CSSProperties;
}

export function Select({ label, hint, options, style, value, onChange, ...rest }: SelectFieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>{label}</label>
      )}
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={onChange}
          style={{
            width: '100%',
            appearance: 'none',
            background: 'var(--panel)',
            border: '1px solid var(--border-strong)',
            borderRadius: 8,
            padding: '0 36px 0 12px',
            height: 42,
            fontSize: 14,
            color: 'var(--ink)',
            fontFamily: 'inherit',
            outline: 'none',
            cursor: 'pointer',
            ...style,
          }}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span
          style={{
            position: 'absolute',
            top: '50%',
            insetInlineEnd: 10,
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: 'var(--muted)',
            display: 'flex',
          }}
        >
          <IconChevronDown size={16} />
        </span>
      </div>
      {hint && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{hint}</span>}
    </div>
  );
}

export function SeverityChip({ level }: { level: string }) {
  const { t } = useI18n();
  const lower = level?.toLowerCase();
  const map: Record<string, { tone: Tone; label: string }> = {
    critical: { tone: 'critical', label: t('sev_critical') },
    high: { tone: 'serious', label: t('sev_high') },
    serious: { tone: 'serious', label: t('sev_serious') },
    moderate: { tone: 'moderate', label: t('sev_moderate') },
    low: { tone: 'moderate', label: t('sev_low') },
  };
  const cfg = map[lower] ?? { tone: 'neutral' as Tone, label: level };
  return (
    <Badge tone={cfg.tone} dot>
      {cfg.label}
    </Badge>
  );
}

export function StatusChip({ status }: { status: string }) {
  const { t } = useI18n();
  const lower = status?.toLowerCase();
  const map: Record<string, { tone: Tone; label: string }> = {
    open: { tone: 'live', label: t('status_open') },
    searching: { tone: 'live', label: t('status_searching') },
    assigned: { tone: 'accent', label: t('status_assigned') },
    dispatched: { tone: 'accent', label: t('status_dispatched') },
    enroute: { tone: 'accent', label: t('status_enroute') },
    on_scene: { tone: 'accent', label: t('status_onscene') },
    onscene: { tone: 'accent', label: t('status_onscene') },
    handoff: { tone: 'neutral', label: t('status_handoff') },
    closed: { tone: 'neutral', label: t('status_closed') },
    expired: { tone: 'neutral', label: t('status_expired') },
  };
  const cfg = map[lower] ?? { tone: 'neutral' as Tone, label: status };
  return (
    <Badge tone={cfg.tone} dot={cfg.tone === 'live'}>
      {cfg.label}
    </Badge>
  );
}

export function SectionTitle({
  children,
  subtitle,
  action,
  style,
}: {
  children: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 14,
        ...style,
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}
        >
          {children}
        </h2>
        {subtitle && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
}) {
  return (
    <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
      <span
        style={{
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: accent ? 'var(--accent)' : 'var(--ink)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
      {sub && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</span>}
    </Card>
  );
}

const avatarTones = ['#0B6E4F', '#0E7490', '#B45309', '#9A1B2F', '#6D28D9', '#1E3A8A'];

export function Avatar({ name, size = 36, tone }: { name?: string | null; size?: number; tone?: string }) {
  const safeName = name ?? '?';
  const initials = safeName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const bg = tone ?? avatarTones[(safeName.charCodeAt(0) || 0) % avatarTones.length];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        color: '#fff',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        flexShrink: 0,
        fontFamily: 'var(--font-en)',
      }}
    >
      {initials}
    </div>
  );
}

export function Divider({ vertical, style }: { vertical?: boolean; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--border)',
        ...(vertical ? { width: 1, alignSelf: 'stretch' } : { height: 1, width: '100%' }),
        ...style,
      }}
    />
  );
}

export function Kbd({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <kbd
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 20,
        minWidth: 20,
        padding: '0 5px',
        borderRadius: 4,
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        background: 'var(--panel-2)',
        border: '1px solid var(--border)',
        color: 'var(--muted)',
        ...style,
      }}
    >
      {children}
    </kbd>
  );
}

export function Logo() {
  const { t } = useI18n();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'var(--accent)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 16,
          letterSpacing: '-0.02em',
        }}
      >
        M
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
          {t('brand')}
        </span>
        <span style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {t('brandTag')}
        </span>
      </div>
    </div>
  );
}
