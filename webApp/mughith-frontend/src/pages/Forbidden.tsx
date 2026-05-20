import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { homeForRole } from '../lib/roleNav';
import { Button, Card } from '../components/common/primitives';
import { IconShield } from '../components/common/Icons';
import { useI18n } from '../lib/i18n';

export default function Forbidden() {
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
        <div style={{ color: 'var(--critical)', display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <IconShield size={48} />
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
          {isAr ? 'الوصول مقيّد' : 'Access restricted'}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '8px 0 20px' }}>
          {isAr ? 'لا تملك صلاحية الوصول لهذه الصفحة.' : 'You do not have permission to access this page.'}
        </p>
        <Button onClick={() => navigate(user ? homeForRole(user.role) : '/login')}>
          {isAr ? 'العودة' : 'Go back'}
        </Button>
      </Card>
    </div>
  );
}
