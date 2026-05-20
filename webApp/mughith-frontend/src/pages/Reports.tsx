import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '../lib/api';
import { listCases } from '../lib/cases';
import { useI18n } from '../lib/i18n';
import { Avatar, Card, Divider, SectionTitle, StatCard } from '../components/common/primitives';
import type { EmergencyCase } from '../types';

export default function Reports() {
  const { t, isAr, num } = useI18n();
  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const all: EmergencyCase[] = [];
        const statuses = ['OPEN', 'ASSIGNED', 'ON_SCENE', 'CLOSED', 'EXPIRED'] as const;
        for (const s of statuses) {
          const r = await listCases({ status: s, page: 1, limit: 100 });
          all.push(...r.data);
        }
        setCases(all);
      } catch (err) {
        toast.error(apiErrorMessage(err, t('error_generic')));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  const { bars, months, total, avgString, acceptance, handoff, severityPct, topResponders } = useMemo(() => {
    const now = new Date();
    const monthBars: number[] = Array(12).fill(0);
    const monthsList: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsList.push(isAr ? d.toLocaleDateString('ar', { month: 'narrow' }) : d.toLocaleDateString('en', { month: 'short' }));
    }
    cases.forEach((c) => {
      const created = new Date(c.createdAt);
      const monthsAgo = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
      const idx = 11 - monthsAgo;
      if (idx >= 0 && idx < 12) monthBars[idx] += 1;
    });

    const closed = cases.filter((c) => c.closedAt);
    let totalMs = 0;
    closed.forEach((c) => {
      totalMs += new Date(c.closedAt!).getTime() - new Date(c.createdAt).getTime();
    });
    const avgMin = closed.length ? totalMs / closed.length / 1000 / 60 : 0;
    const mm = Math.floor(avgMin);
    const ss = Math.round((avgMin - mm) * 60);
    const avgStr = closed.length ? `${mm}:${String(ss).padStart(2, '0')}` : '—';

    const assigned = cases.filter((c) => c.assignedToId).length;
    const acceptanceRate = cases.length ? Math.round((assigned / cases.length) * 100) : 0;
    const handoffRate = closed.length
      ? Math.round((closed.filter((c) => c.outcome).length / closed.length) * 100)
      : 0;

    const sevCount: Record<string, number> = {};
    cases.forEach((c) => {
      sevCount[c.severity] = (sevCount[c.severity] || 0) + 1;
    });
    const totalCount = cases.length || 1;
    const sevPct = (['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map((k) => ({
      k,
      pct: Math.round(((sevCount[k] || 0) / totalCount) * 100),
    }));

    const respMap = new Map<string, { name: string; cases: number }>();
    closed.forEach((c) => {
      if (c.assignedTo) {
        const cur = respMap.get(c.assignedTo.id) ?? { name: c.assignedTo.name, cases: 0 };
        cur.cases += 1;
        respMap.set(c.assignedTo.id, cur);
      }
    });
    const top = Array.from(respMap.values()).sort((a, b) => b.cases - a.cases).slice(0, 3);

    return {
      bars: monthBars,
      months: monthsList,
      total: cases.length,
      avgString: avgStr,
      acceptance: acceptanceRate,
      handoff: handoffRate,
      severityPct: sevPct,
      topResponders: top,
    };
  }, [cases, isAr]);

  const maxBar = Math.max(1, ...bars);

  const severityCfg: Record<string, { label: string; color: string }> = {
    CRITICAL: { label: t('sev_critical'), color: 'var(--critical)' },
    HIGH: { label: t('sev_high'), color: 'var(--serious)' },
    MODERATE: { label: t('sev_moderate'), color: 'var(--moderate)' },
    LOW: { label: t('sev_low'), color: 'var(--muted)' },
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>{t('nav_reports')}</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
          {isAr ? 'أداء الاستجابة · آخر ١٢ شهرًا' : 'Response performance · last 12 months'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label={isAr ? 'إجمالي الحالات' : 'Total cases'} value={num(total)} accent />
        <StatCard label={isAr ? 'متوسط الاستجابة' : 'Avg. response'} value={avgString} />
        <StatCard label={isAr ? 'معدّل القبول' : 'Acceptance rate'} value={`${num(acceptance)}%`} />
        <StatCard label={isAr ? 'تسليم ناجح' : 'Successful handoff'} value={`${num(handoff)}%`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <SectionTitle subtitle={isAr ? 'عدد الحالات الشهرية' : 'Monthly case volume'}>
            {isAr ? 'حجم الحالات' : 'Case volume'}
          </SectionTitle>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 220, padding: '0 4px' }}>
            {bars.map((b, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: '100%',
                    height: `${(b / maxBar) * 180}px`,
                    background: i === bars.length - 1 ? 'var(--accent)' : 'var(--accent-soft)',
                    border: `1px solid ${i === bars.length - 1 ? 'var(--accent)' : 'transparent'}`,
                    borderRadius: '4px 4px 0 0',
                    position: 'relative',
                  }}
                >
                  {i === bars.length - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -22,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--ink)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {num(b)}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-en)' }}>{months[i]}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>{isAr ? 'الحالات حسب الخطورة' : 'Cases by severity'}</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {severityPct.map((r) => {
              const cfg = severityCfg[r.k];
              return (
                <div key={r.k}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ fontWeight: 500 }}>{cfg.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{num(r.pct)}%</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--panel-2)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${r.pct}%`, height: '100%', background: cfg.color, borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>
          <Divider style={{ margin: '18px 0 14px' }} />
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
            {isAr
              ? 'استنادًا إلى الحالات المسجّلة. تُحسب الإحصائيات على المتصفّح من بيانات الباك‑إند.'
              : 'Computed on the frontend from backend case records.'}
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle subtitle={isAr ? 'أفضل المستجيبين هذا الشهر' : 'Top responders'}>
          {isAr ? 'المستجيبون' : 'Responders'}
        </SectionTitle>
        {topResponders.length === 0 ? (
          <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>{t('no_data')}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {topResponders.map((r, i) => (
              <div
                key={r.name + i}
                style={{
                  padding: 12,
                  background: 'var(--panel-2)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: 'var(--accent)',
                    fontFamily: 'var(--font-mono)',
                    width: 32,
                  }}
                >
                  #{num(i + 1)}
                </div>
                <Avatar name={r.name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                    {num(r.cases)} {isAr ? 'حالة' : 'cases'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
