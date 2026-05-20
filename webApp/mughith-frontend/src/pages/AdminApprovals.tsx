import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '../lib/api';
import { listDonators, verifyDonator } from '../lib/users';
import { useI18n } from '../lib/i18n';
import { Avatar, Badge, Button, Card } from '../components/common/primitives';
import type { User } from '../types';
import { formatDistanceToNow } from 'date-fns';

type Filter = 'pending' | 'approved' | 'all';

export default function AdminApprovals() {
  const { t, isAr } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listDonators({ page: 1, limit: 100 });
      setUsers(r.data);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('error_generic')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleVerify = async (id: string) => {
    setVerifying(id);
    try {
      await verifyDonator(id);
      toast.success(isAr ? 'تم اعتماد المتطوع' : 'Volunteer verified');
      await refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setVerifying(null);
    }
  };

  const shown = users.filter((u) => {
    if (filter === 'pending') return !u.isVerified;
    if (filter === 'approved') return u.isVerified;
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
          {isAr ? 'اعتماد المتطوعين' : 'Volunteer approvals'}
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
          {isAr ? 'مراجعة طلبات الانضمام والوثائق' : 'Review applications and certification documents'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {([
          { k: 'pending' as Filter, l: isAr ? 'قيد الانتظار' : 'Pending' },
          { k: 'approved' as Filter, l: isAr ? 'معتمد' : 'Approved' },
          { k: 'all' as Filter, l: isAr ? 'الكل' : 'All' },
        ]).map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 600,
              background: filter === f.k ? 'var(--accent-soft)' : 'var(--panel)',
              color: filter === f.k ? 'var(--accent-ink)' : 'var(--ink-2)',
              border: `1px solid ${filter === f.k ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >
            {f.l}
          </button>
        ))}
      </div>

      <Card padded={false}>
        {shown.length === 0 && !loading && (
          <div style={{ padding: 24, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>{t('no_data')}</div>
        )}
        {shown.map((p, i) => {
          const submitted = formatDistanceToNow(new Date(p.createdAt), { addSuffix: false });
          return (
            <div
              key={p.id}
              style={{
                padding: '14px 18px',
                borderBottom: i === shown.length - 1 ? 'none' : '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <Avatar name={p.name} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {p.certification ?? '—'} · {p.email} · {isAr ? 'منذ' : 'submitted'} {submitted}
                </div>
              </div>
              <Badge tone={p.isVerified ? 'accent' : 'serious'}>
                {p.isVerified ? t('verified') : t('not_verified')}
              </Badge>
              {!p.isVerified && (
                <Button size="sm" onClick={() => handleVerify(p.id)} loading={verifying === p.id}>
                  {t('approve')}
                </Button>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
