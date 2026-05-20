import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '../lib/api';
import { listCases } from '../lib/cases';
import { listDonators } from '../lib/users';
import { useI18n } from '../lib/i18n';
import { Avatar, Badge, Button, Card, SectionTitle, StatCard } from '../components/common/primitives';
import type { EmergencyCase, User } from '../types';

export default function AdminHome() {
  const { t, isAr, num } = useI18n();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [activeCases, setActiveCases] = useState<EmergencyCase[]>([]);
  const [allRecent, setAllRecent] = useState<EmergencyCase[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [donatorR, openR, assignedR, onSceneR, allR] = await Promise.all([
          listDonators({ page: 1, limit: 100 }),
          listCases({ status: 'OPEN', page: 1, limit: 100 }),
          listCases({ status: 'ASSIGNED', page: 1, limit: 100 }),
          listCases({ status: 'ON_SCENE', page: 1, limit: 100 }),
          listCases({ page: 1, limit: 200 }),
        ]);
        setUsers(donatorR.data);
        setActiveCases([...openR.data, ...assignedR.data, ...onSceneR.data]);
        setAllRecent(allR.data);
      } catch (err) {
        toast.error(apiErrorMessage(err, t('error_generic')));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = allRecent.filter((c) => new Date(c.createdAt) >= today).length;
    const pending = users.filter((u) => !u.isVerified).length;
    return {
      volunteers: users.filter((u) => u.isVerified).length,
      pending,
      todayCases: todayCount,
      active: activeCases.length,
    };
  }, [users, activeCases, allRecent]);

  const pendingList = users.filter((u) => !u.isVerified).slice(0, 5);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
          {isAr ? 'لوحة المشرف' : 'Admin Console'}
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
          {isAr ? 'إدارة النظام' : 'System management'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard
          label={isAr ? 'المتطوعون' : 'Volunteers'}
          value={num(stats.volunteers)}
          sub={`+${num(stats.pending)} ${isAr ? 'بانتظار الاعتماد' : 'pending'}`}
        />
        <StatCard label={isAr ? 'حالات نشطة' : 'Active cases'} value={num(stats.active)} accent />
        <StatCard label={isAr ? 'الحالات اليوم' : 'Cases today'} value={num(stats.todayCases)} />
        <StatCard label={isAr ? 'وقت التشغيل' : 'Uptime'} value="99.97%" sub="30 days" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card padded={false}>
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
              {isAr ? 'متطوعون بانتظار الاعتماد' : 'Pending verification'}
            </h3>
            <Badge tone="serious">{num(stats.pending)}</Badge>
          </div>
          {pendingList.length === 0 ? (
            <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
              {t('no_data')}
            </div>
          ) : (
            pendingList.map((p, i) => (
              <div
                key={p.id}
                style={{
                  padding: '12px 16px',
                  borderBottom: i === pendingList.length - 1 ? 'none' : '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Avatar name={p.name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    {p.certification ?? t('certified')} · {p.email}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/admin/approvals')}>
                  {isAr ? 'مراجعة' : 'Review'}
                </Button>
              </div>
            ))
          )}
        </Card>

        <Card padded={false}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{isAr ? 'مراكز الإرسال' : 'Dispatch centers'}</h3>
          </div>
          <div style={{ padding: 14, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
            {isAr
              ? 'لم تُدار مراكز الإرسال كنوع منفصل في الباك‑إند بعد. تظهر هنا كعرض تجريبي.'
              : 'Dispatch centers are not yet tracked as a separate entity in the backend; this is a placeholder.'}
          </div>
          {[
            { name: 'DC-03 Makkah', ops: 9, cases: stats.active, status: 'online' },
          ].map((d) => (
            <div
              key={d.name}
              style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
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
              <div style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{d.name}</div>
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--muted)',
                  textAlign: 'end',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {num(d.ops)} {isAr ? 'مشغّل' : 'ops'} · {num(d.cases)} {isAr ? 'حالة' : 'cases'}
              </div>
            </div>
          ))}
        </Card>
      </div>

      <Card>
        <SectionTitle subtitle={isAr ? 'ملخّص النظام' : 'Quick links'}>{isAr ? 'إجراءات سريعة' : 'Quick actions'}</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <Button variant="secondary" onClick={() => navigate('/admin/approvals')}>
            {t('pending_approvals')}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/admin/users')}>
            {isAr ? 'المستخدمون' : 'Users'}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/admin/centers')}>
            {t('dispatch_centers')}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/admin/system')}>
            {isAr ? 'صحّة النظام' : 'System health'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
