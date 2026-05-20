import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '../lib/api';
import { register } from '../lib/auth';
import { useStore } from '../store/useStore';
import { useI18n } from '../lib/i18n';
import { homeForRole } from '../lib/roleNav';
import { Button, Card, Input } from '../components/common/primitives';
import { IconLock, IconMail, IconPhone, IconUser } from '../components/common/Icons';

export default function Register() {
  const { t, isAr } = useI18n();
  const navigate = useNavigate();
  const setSession = useStore((s) => s.setSession);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await register({
        email: email.trim(),
        password,
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      setSession(res.user, res.accessToken);
      toast.success(isAr ? 'تم إنشاء الحساب' : 'Account created');
      navigate(homeForRole(res.user.role), { replace: true });
    } catch (err) {
      toast.error(apiErrorMessage(err, isAr ? 'فشل إنشاء الحساب' : 'Registration failed'));
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
      <Card style={{ width: '100%', maxWidth: 440, padding: '40px 48px', boxShadow: 'var(--shadow-lg)' }}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>{t('register_title')}</h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--muted)' }}>{t('register_sub')}</p>
          </div>

          <Input
            label={t('register_name')}
            icon={<IconUser size={16} />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label={t('register_email')}
            icon={<IconMail size={16} />}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label={t('register_phone')}
            icon={<IconPhone size={16} />}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+966500000000"
          />
          <Input
            label={t('register_password')}
            icon={<IconLock size={16} />}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />

          <Button type="submit" full size="lg" loading={loading}>
            {t('register_cta')}
          </Button>

          <div style={{ textAlign: 'center', fontSize: 13 }}>
            <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>
              {t('register_have_account')}
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
