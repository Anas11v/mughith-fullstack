import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { homeForRole } from '../lib/roleNav';
import { Button, Card } from '../components/common/primitives';
import { IconTarget } from '../components/common/Icons';
import { useI18n } from '../lib/i18n';

export default function NotFound() {
  const { isAr } = useI18n();
  const navigate = useNavigate();
  const user = useStore((s) => s.user);

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
      <Card style={{ maxWidth: 420, textAlign: 'center', padding: '40px 32px' }}>
        <div style={{ color: 'var(--muted)', display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <IconTarget size={48} />
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>404</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '8px 0 20px' }}>
          {isAr ? 'الصفحة غير موجودة.' : 'This page could not be found.'}
        </p>
        <Button onClick={() => navigate(user ? homeForRole(user.role) : '/login')}>
          {isAr ? 'العودة للرئيسية' : 'Back to home'}
        </Button>
      </Card>
    </div>
  );
}
