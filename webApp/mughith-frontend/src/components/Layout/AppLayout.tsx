import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../../store/useStore';
import { useI18n } from '../../lib/i18n';
import { canAccessRoute, homeForRole, navForRole, type NavIcon } from '../../lib/roleNav';
import { disconnectSockets } from '../../lib/socket';
import {
  IconAlert,
  IconBell,
  IconCases,
  IconChevronDown,
  IconDashboard,
  IconGlobe,
  IconHeart,
  IconHelp,
  IconLayers,
  IconLogout,
  IconMoon,
  IconPlus,
  IconReports,
  IconSearch,
  IconSettings,
  IconShield,
  IconSun,
  IconTarget,
  IconUser,
  IconVolunteers,
} from '../common/Icons';
import { Avatar, Divider, Kbd, Logo } from '../common/primitives';
import { applyAccent, applyTheme, loadAccent, loadTheme, type AccentKey, type ThemeMode } from '../../lib/theme';

const iconFor = (k: NavIcon): ReactNode => {
  switch (k) {
    case 'dashboard':
      return <IconDashboard size={17} />;
    case 'plus':
      return <IconPlus size={17} />;
    case 'cases':
      return <IconCases size={17} />;
    case 'volunteers':
      return <IconVolunteers size={17} />;
    case 'reports':
      return <IconReports size={17} />;
    case 'shield':
      return <IconShield size={17} />;
    case 'layers':
      return <IconLayers size={17} />;
    case 'alert':
      return <IconAlert size={17} />;
    case 'target':
      return <IconTarget size={17} />;
    case 'heart':
      return <IconHeart size={17} />;
    case 'user':
      return <IconUser size={17} />;
    case 'settings':
      return <IconSettings size={17} />;
    case 'help':
      return <IconHelp size={17} />;
  }
};

export default function AppLayout() {
  const { t, isAr, lang, setLang } = useI18n();
  const user = useStore((s) => s.user);
  const accessToken = useStore((s) => s.accessToken);
  const logout = useStore((s) => s.logout);
  const nav = navForRole(user?.role);
  const navigate = useNavigate();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [theme, setThemeState] = useState<ThemeMode>(() => loadTheme());
  const [accent, setAccentState] = useState<AccentKey>(() => loadAccent());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  useEffect(() => {
    if (!user || !accessToken) {
      navigate('/login', { replace: true });
    }
  }, [user, accessToken, navigate]);

  useEffect(() => {
    if (user && !canAccessRoute(user.role, location.pathname)) {
      navigate(homeForRole(user.role), { replace: true });
    }
  }, [user, location.pathname, navigate]);

  const onSignOut = () => {
    logout();
    disconnectSockets();
    toast.success(isAr ? 'تم تسجيل الخروج' : 'Signed out');
    navigate('/login');
  };

  if (!user || !accessToken) return null;

  const isCaseDetail = /^\/cases\/[^/]+/.test(location.pathname);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh', background: 'var(--bg)' }}>
      <aside
        style={{
          borderInlineEnd: '1px solid var(--border)',
          background: 'var(--panel)',
          display: 'flex',
          flexDirection: 'column',
          padding: '18px 14px',
        }}
      >
        <div style={{ padding: '0 6px 18px', borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
          <Logo />
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin' || item.to === '/dashboard' || item.to === '/vol/home'}
              style={({ isActive }) => {
                const active = isActive || (item.to === '/cases' && isCaseDetail);
                return {
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent-ink)' : 'var(--ink-2)',
                  cursor: 'pointer',
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 500,
                  fontFamily: 'inherit',
                  textAlign: 'start',
                  textDecoration: 'none',
                  transition: 'background 120ms ease',
                };
              }}
            >
              {({ isActive }) => {
                const active = isActive || (item.to === '/cases' && isCaseDetail);
                return (
                  <>
                    <span style={{ color: active ? 'var(--accent)' : 'var(--muted)', display: 'flex' }}>
                      {iconFor(item.iconKey)}
                    </span>
                    {t(item.labelKey)}
                  </>
                );
              }}
            </NavLink>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 10 }}>
          <button type="button" onClick={() => setSettingsOpen((v) => !v)} style={settingsBtnStyle}>
            <span style={{ color: 'var(--muted)', display: 'flex' }}>
              <IconSettings size={17} />
            </span>
            {t('nav_settings')}
          </button>
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: 'var(--panel-2)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: '#22c55e',
              boxShadow: '0 0 0 3px rgba(34,197,94,0.2)',
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)' }}>
              {isAr ? 'المحطة متّصلة' : 'Station online'}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              {user.role} · {isAr ? 'مكة' : 'Makkah'}
            </div>
          </div>
        </div>
      </aside>

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          style={{
            height: 56,
            borderBottom: '1px solid var(--border)',
            background: 'var(--panel)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 22px',
          }}
        >
          <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
            <span
              style={{
                position: 'absolute',
                top: '50%',
                insetInlineStart: 12,
                transform: 'translateY(-50%)',
                color: 'var(--muted)',
              }}
            >
              <IconSearch size={15} />
            </span>
            <input
              placeholder={t('search_cases')}
              style={{
                width: '100%',
                height: 36,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--panel-2)',
                paddingInlineStart: 36,
                paddingInlineEnd: 48,
                fontSize: 13,
                color: 'var(--ink)',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <Kbd
              style={{
                position: 'absolute',
                top: '50%',
                insetInlineEnd: 10,
                transform: 'translateY(-50%)',
              }}
            >
              ⌘K
            </Kbd>
          </div>
          <div style={{ flex: 1 }} />

          <button type="button" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} style={iconBtnStyle} title="Language">
            <IconGlobe size={17} />
          </button>
          <button
            type="button"
            onClick={() => setThemeState((v) => (v === 'light' ? 'dark' : 'light'))}
            style={iconBtnStyle}
            title="Theme"
          >
            {theme === 'light' ? <IconMoon size={17} /> : <IconSun size={17} />}
          </button>
          <button type="button" style={iconBtnStyle} title="Notifications">
            <IconBell size={17} />
            <span
              style={{
                position: 'absolute',
                top: 8,
                insetInlineEnd: 8,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--critical)',
                border: '2px solid var(--panel)',
              }}
            />
          </button>

          <Divider vertical style={{ height: 24 }} />

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              style={{ ...iconBtnStyle, width: 'auto', padding: '0 10px', gap: 10, borderRadius: 8 }}
            >
              <Avatar name={user.name} size={28} />
              <div style={{ textAlign: isAr ? 'end' : 'start' }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{user.name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                  {user.role}
                </div>
              </div>
              <IconChevronDown size={14} style={{ color: 'var(--muted)' }} />
            </button>
            {profileOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  insetInlineEnd: 0,
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  boxShadow: 'var(--shadow-md)',
                  padding: 6,
                  minWidth: 200,
                  zIndex: 100,
                }}
              >
                <button type="button" onClick={onSignOut} style={menuItemStyle}>
                  <IconLogout size={15} /> {t('sign_out')}
                </button>
              </div>
            )}
          </div>
        </header>

        {settingsOpen && (
          <div
            style={{
              padding: '14px 22px',
              background: 'var(--panel)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              gap: 24,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <SettingsGroup label={t('settings_theme')}>
              <Pill active={theme === 'light'} onClick={() => setThemeState('light')}>
                <IconSun size={13} /> {t('light')}
              </Pill>
              <Pill active={theme === 'dark'} onClick={() => setThemeState('dark')}>
                <IconMoon size={13} /> {t('dark')}
              </Pill>
            </SettingsGroup>
            <SettingsGroup label={t('settings_lang')}>
              <Pill active={lang === 'en'} onClick={() => setLang('en')}>
                EN
              </Pill>
              <Pill active={lang === 'ar'} onClick={() => setLang('ar')}>
                AR
              </Pill>
            </SettingsGroup>
            <SettingsGroup label={t('settings_accent')}>
              {(['green', 'teal', 'navy', 'crimson'] as AccentKey[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAccentState(a)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: accent === a ? '2px solid var(--ink)' : '1px solid var(--border)',
                    background: accentSwatch[a],
                    cursor: 'pointer',
                  }}
                  title={a}
                />
              ))}
            </SettingsGroup>
          </div>
        )}

        <main style={{ flex: 1, padding: '24px 28px', overflow: 'auto', minWidth: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const accentSwatch: Record<AccentKey, string> = {
  green: '#0B6E4F',
  teal: '#0E7490',
  navy: '#1E3A8A',
  crimson: '#9A1B2F',
};

const iconBtnStyle: CSSProperties = {
  position: 'relative',
  width: 36,
  height: 36,
  borderRadius: 8,
  background: 'transparent',
  border: '1px solid transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--ink-2)',
  fontFamily: 'inherit',
};

const settingsBtnStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '9px 12px',
  borderRadius: 8,
  border: 'none',
  background: 'transparent',
  color: 'var(--ink-2)',
  cursor: 'pointer',
  fontSize: 13.5,
  fontWeight: 500,
  fontFamily: 'inherit',
  textAlign: 'start',
};

const menuItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  background: 'transparent',
  border: 'none',
  color: 'var(--ink)',
  cursor: 'pointer',
  fontSize: 13,
  fontFamily: 'inherit',
  textAlign: 'start',
};

function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', gap: 6 }}>{children}</div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 30,
        padding: '0 12px',
        borderRadius: 999,
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border-strong)'}`,
        background: active ? 'var(--accent-soft)' : 'var(--panel)',
        color: active ? 'var(--accent-ink)' : 'var(--ink-2)',
        fontWeight: 600,
        fontSize: 12.5,
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}
