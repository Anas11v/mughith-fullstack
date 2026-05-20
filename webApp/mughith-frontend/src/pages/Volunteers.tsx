import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '../lib/api';
import { listDonators } from '../lib/users';
import { useI18n } from '../lib/i18n';
import { Avatar, Badge, Button, Card, StatCard } from '../components/common/primitives';
import { IconShield } from '../components/common/Icons';
import type { User } from '../types';
import { donatorState } from '../lib/geo';

type Filter = 'all' | 'AVAILABLE' | 'BUSY' | 'OFFLINE';

export default function Volunteers() {
  const { t, isAr, num } = useI18n();
  const [vols, setVols] = useState<User[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVols = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listDonators({ page: 1, limit: 100 });
      setVols(res.data ?? []);
    } catch (err) {
      const msg = apiErrorMessage(err, t('error_generic'));
      setError(msg);
      toast.error(msg);
      console.error('[Volunteers] listDonators failed:', err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchVols();
  }, [fetchVols]);

  const stats = useMemo(() => {
    const verified = vols.filter((v) => v.isVerified).length;
    const available = vols.filter((v) => donatorState(v) === 'AVAILABLE').length;
    const busy = vols.filter((v) => donatorState(v) === 'BUSY').length;
    return { total: verified, available, busy };
  }, [vols]);

  const filtered = useMemo(() => {
    if (filter === 'all') return vols;
    return vols.filter((v) => donatorState(v) === filter);
  }, [vols, filter]);

  const statusLabels: Record<'AVAILABLE' | 'BUSY' | 'OFFLINE', { tone: 'accent' | 'critical' | 'neutral'; label: string }> = {
    AVAILABLE: { tone: 'accent', label: t('available') },
    BUSY: { tone: 'critical', label: t('busy') },
    OFFLINE: { tone: 'neutral', label: t('offline') },
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>{t('nav_volunteers')}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            {isAr ? 'المتطوعون المعتمدون ضمن المنطقة' : 'Certified volunteers within region'}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label={isAr ? 'إجمالي المعتمدين' : 'Certified total'} value={num(stats.total)} />
        <StatCard label={isAr ? 'متاح الآن' : 'Available now'} value={num(stats.available)} accent />
        <StatCard label={isAr ? 'يستجيبون' : 'Responding'} value={num(stats.busy)} />
        <StatCard label={isAr ? 'إجمالي المسجلين' : 'Total registered'} value={num(vols.length)} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {([
          { k: 'all' as Filter, label: t('filter_all') },
          { k: 'AVAILABLE' as Filter, label: t('available') },
          { k: 'BUSY' as Filter, label: t('busy') },
          { k: 'OFFLINE' as Filter, label: t('offline') },
        ]).map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            style={{
              height: 32,
              padding: '0 14px',
              borderRadius: 999,
              border: `1px solid ${filter === f.k ? 'var(--accent)' : 'var(--border-strong)'}`,
              background: filter === f.k ? 'var(--accent-soft)' : 'var(--panel)',
              color: filter === f.k ? 'var(--accent-ink)' : 'var(--ink-2)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Card>
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>{t('loading')}</div>
        </Card>
      ) : error ? (
        <Card>
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ color: 'var(--critical)', marginBottom: 12 }}>{error}</div>
            <Button onClick={fetchVols}>{isAr ? 'إعادة المحاولة' : 'Retry'}</Button>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>
            {vols.length === 0
              ? isAr
                ? 'لا يوجد متطوّعون مسجّلون.'
                : 'No donators registered yet.'
              : isAr
                ? `لا متطوّعون يطابقون الفلتر (المجموع ${num(vols.length)}). جرّب «الكل».`
                : `No donators match the current filter (total ${num(vols.length)}). Try "All".`}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {filtered.map((v) => {
            const state = donatorState(v);
            const cfg = statusLabels[state];
            return (
              <Card key={v.id} hover style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Avatar name={v.name} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{v.name}</div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <IconShield size={11} /> {v.certification ?? t('certified')}
                    </div>
                  </div>
                  <Badge tone={cfg.tone} dot={state === 'AVAILABLE' || state === 'BUSY'}>
                    {cfg.label}
                  </Badge>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                    padding: 10,
                    background: 'var(--panel-2)',
                    borderRadius: 6,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <MiniStat label={isAr ? 'الإيميل' : 'Email'} value={v.email} small />
                  <MiniStat label={isAr ? 'الهاتف' : 'Phone'} value={v.phone ?? '—'} small />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div style={{ textAlign: 'start' }}>
      <div
        style={{
          fontSize: 10,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 600,
          fontFamily: 'var(--font-en)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: small ? 11.5 : 14,
          fontWeight: 600,
          color: 'var(--ink)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </div>
    </div>
  );
}
