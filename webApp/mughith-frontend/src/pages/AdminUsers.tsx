import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '../lib/api';
import { listDonators } from '../lib/users';
import { useI18n } from '../lib/i18n';
import { Avatar, Badge, Card } from '../components/common/primitives';
import type { User } from '../types';
import { formatDistanceToNow } from 'date-fns';

export default function AdminUsers() {
  const { t, isAr } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await listDonators({ page: 1, limit: 100 });
        setUsers(r.data);
      } catch (err) {
        toast.error(apiErrorMessage(err, t('error_generic')));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
          {isAr ? 'المستخدمون والصلاحيات' : 'Users & roles'}
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
          {isAr
            ? 'إدارة الحسابات — يعرض الباك‑إند المتطوعين فقط حاليًا'
            : 'Manage accounts — backend currently exposes donator records'}
        </p>
      </div>

      <Card padded={false}>
        <div
          style={{
            padding: '10px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'grid',
            gridTemplateColumns: '1.8fr 1fr 1.2fr 0.8fr 0.6fr',
            gap: 14,
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          <div>{isAr ? 'المستخدم' : 'User'}</div>
          <div>{isAr ? 'الدور' : 'Role'}</div>
          <div>{isAr ? 'الحالة' : 'Status'}</div>
          <div>{isAr ? 'تم الإنشاء' : 'Created'}</div>
          <div />
        </div>
        {users.length === 0 && !loading ? (
          <div style={{ padding: 24, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>{t('no_data')}</div>
        ) : (
          users.map((u, i) => (
            <div
              key={u.id}
              style={{
                padding: '12px 18px',
                borderBottom: i === users.length - 1 ? 'none' : '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: '1.8fr 1fr 1.2fr 0.8fr 0.6fr',
                gap: 14,
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={u.name} size={32} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.email}</div>
                </div>
              </div>
              <div>
                <Badge tone="accent">{u.role}</Badge>
              </div>
              <div>
                {u.isVerified ? (
                  <Badge tone="accent">{t('verified')}</Badge>
                ) : (
                  <Badge tone="serious">{t('not_verified')}</Badge>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {formatDistanceToNow(new Date(u.createdAt), { addSuffix: false })}
              </div>
              <div />
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
