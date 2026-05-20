import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '../lib/api';
import { login } from '../lib/auth';
import { useStore } from '../store/useStore';
import { useI18n } from '../lib/i18n';
import { homeForRole } from '../lib/roleNav';
import { Button, Card, Divider, Input } from '../components/common/primitives';
import { IconArrow, IconLock, IconMail, IconShield } from '../components/common/Icons';

function Logo({ inverted = false }: { inverted?: boolean }) {
  const { isAr } = useI18n();
  const c = inverted ? '#fff' : 'var(--accent)';
  const cText = inverted ? '#fff' : 'var(--ink)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
        <rect width="40" height="40" rx="9" fill={inverted ? 'rgba(255,255,255,0.15)' : 'var(--accent-soft)'} />
        <path
          d="M10 28 L10 13 L16 13 L20 22 L24 13 L30 13 L30 28"
          stroke={c}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M8 22 L12 22 L14 19 L16 25 L18 22 L22 22"
          stroke={inverted ? '#fff' : 'var(--critical)'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.9"
        />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: cText,
            fontFamily: isAr ? 'var(--font-ar)' : 'var(--font-en)',
          }}
        >
          {isAr ? 'مُغيث' : 'Mughith'}
        </div>
        <div
          style={{
            fontSize: 10,
            color: inverted ? 'rgba(255,255,255,0.7)' : 'var(--muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-en)',
          }}
        >
          {isAr ? 'Mughith' : 'مُغيث'}
        </div>
      </div>
    </div>
  );
}

function StatInline({ big, small }: { big: string; small: string }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
        {big}
      </div>
      <div style={{ fontSize: 10.5, opacity: 0.85, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {small}
      </div>
    </div>
  );
}

export default function Login() {
  const { t, isAr } = useI18n();
  const navigate = useNavigate();
  const setSession = useStore((s) => s.setSession);
  const user = useStore((s) => s.user);
  const accessToken = useStore((s) => s.accessToken);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && accessToken) {
      navigate(homeForRole(user.role), { replace: true });
    }
  }, [user, accessToken, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      setSession(res.user, res.accessToken);
      toast.success(isAr ? 'تم تسجيل الدخول' : 'Signed in');
      navigate(homeForRole(res.user.role), { replace: true });
    } catch (err) {
      toast.error(apiErrorMessage(err, isAr ? 'فشل تسجيل الدخول' : 'Sign-in failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 1000,
          padding: 0,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(160deg, var(--accent-700), var(--accent-500))',
            color: '#fff',
            padding: '48px 44px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 580,
          }}
        >
          <svg
            viewBox="0 0 400 400"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08 }}
          >
            <defs>
              <pattern id="star" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <path
                  d="M30 5 L36 22 L54 22 L40 33 L46 50 L30 40 L14 50 L20 33 L6 22 L24 22 Z"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#star)" />
          </svg>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <Logo inverted />
            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                opacity: 0.8,
                fontWeight: 500,
              }}
            >
              {t('brandTag')}
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                fontSize: 32,
                lineHeight: 1.2,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                maxWidth: 360,
                marginBottom: 20,
              }}
            >
              {isAr
                ? 'كل ثانية مهمّة. مُغيث يربط المشغّلين بالمتطوعين المعتمدين القريبين خلال لحظات.'
                : 'Every second counts. Mughith connects operators to certified nearby volunteers in moments.'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: 0.9 }}>
              <StatInline big="28.8" small={isAr ? 'وفاة طرقية / ١٠٠ ألف' : 'road deaths / 100k'} />
              <Divider vertical style={{ background: 'rgba(255,255,255,0.25)', height: 28 }} />
              <StatInline big="<1m" small={isAr ? 'متوسط مطابقة المتطوع' : 'avg. volunteer match'} />
              <Divider vertical style={{ background: 'rgba(255,255,255,0.25)', height: 28 }} />
              <StatInline big="24/7" small={isAr ? 'متاح' : 'available'} />
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              fontSize: 11.5,
              opacity: 0.7,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <IconShield size={13} />
            <span>{isAr ? 'جامعة أم القرى · قسم هندسة البرمجيات' : 'Umm Al-Qura University · Software Engineering'}</span>
          </div>
        </div>

        <form
          onSubmit={submit}
          style={{
            padding: '48px 56px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 18,
            minHeight: 580,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>{t('login_title')}</h1>
            <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--muted)' }}>{t('login_sub')}</p>
          </div>

          <Input
            label={t('login_email')}
            icon={<IconMail size={16} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            required
          />
          <Input
            label={t('login_password')}
            type="password"
            icon={<IconLock size={16} />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <Button
            type="submit"
            full
            size="lg"
            loading={loading}
            iconEnd={!loading ? <IconArrow size={16} style={{ transform: isAr ? 'scaleX(-1)' : 'none' }} /> : undefined}
          >
            {loading ? t('login_signing') : t('login_cta')}
          </Button>

          <div style={{ textAlign: 'center', fontSize: 13 }}>
            <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 500 }}>
              {t('login_register_cta')}
            </Link>
          </div>

          <div
            style={{
              fontSize: 11.5,
              color: 'var(--faint)',
              lineHeight: 1.6,
              marginTop: 4,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <IconShield size={14} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>{t('login_legal')}</span>
          </div>
        </form>
      </Card>
    </div>
  );
}
