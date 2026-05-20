import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '../lib/api';
import { listNotifications, markRead } from '../lib/notifications';
import { acceptCase, rejectCase } from '../lib/dispatch';
import { getCase } from '../lib/cases';
import { useI18n } from '../lib/i18n';
import { useStore } from '../store/useStore';
import { Badge, Button, Card } from '../components/common/primitives';
import { IconCheck, IconHeart, IconPin, IconTarget, IconX } from '../components/common/Icons';
import type { EmergencyCase, Notification } from '../types';

export default function VolunteerAlert() {
  const { t, isAr } = useI18n();
  const navigate = useNavigate();
  const setActiveCaseId = useStore((s) => s.setActiveCaseId);
  const [active, setActive] = useState<{ notif: Notification; caseData: EmergencyCase } | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const notifs = await listNotifications(true);
      const alerts = notifs.filter((n) => n.type === 'CASE_ALERT' && n.caseId);
      let next: { notif: Notification; caseData: EmergencyCase } | null = null;
      for (const n of alerts) {
        try {
          const c = await getCase(n.caseId!);
          if (c.status === 'OPEN') {
            next = { notif: n, caseData: c };
            break;
          }
          // Stale alert (already assigned/closed/expired) — silently mark read so it stops showing
          await markRead(n.id).catch(() => {});
        } catch {
          // case unreachable — drop the notification too
          await markRead(n.id).catch(() => {});
        }
      }
      setActive(next);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('error_generic')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 12000);
    return () => clearInterval(i);
  }, [refresh]);

  const onAccept = async () => {
    if (!active) return;
    setWorking(true);
    try {
      await acceptCase(active.caseData.id);
      await markRead(active.notif.id).catch(() => {});
      setActiveCaseId(active.caseData.id);
      toast.success(isAr ? 'تم قبول الحالة' : 'Case accepted');
      navigate('/vol/navigate', { state: { caseId: active.caseData.id } });
    } catch (err) {
      toast.error(
        apiErrorMessage(err, isAr ? 'تم تكليف متطوع آخر بهذه الحالة' : 'Another volunteer already accepted this case'),
      );
      // Drop the stale alert so we don't see it again, and look for the next one.
      await markRead(active.notif.id).catch(() => {});
      await refresh();
    } finally {
      setWorking(false);
    }
  };

  const onDecline = async () => {
    if (!active) return;
    setWorking(true);
    try {
      await rejectCase(active.caseData.id);
      toast.success(isAr ? 'تم رفض الحالة' : 'Case declined');
      await refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--muted)' }}>{t('loading')}</div>;
  }

  if (!active) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <Card style={{ padding: 40 }}>
          <div style={{ color: 'var(--muted)', fontSize: 32, marginBottom: 12 }}>—</div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t('no_alerts')}</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '8px 0 0' }}>
            {isAr ? 'ستظهر التنبيهات هنا فور ورودها.' : 'New dispatch alerts will appear here.'}
          </p>
        </Card>
      </div>
    );
  }

  const { caseData } = active;
  const sevColor =
    caseData.severity === 'CRITICAL'
      ? 'var(--critical)'
      : caseData.severity === 'HIGH'
        ? 'var(--serious)'
        : 'var(--moderate)';

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <Card
        style={{
          padding: '24px 22px',
          background: 'linear-gradient(160deg, rgba(200,16,46,0.08), var(--panel))',
          border: `1px solid ${sevColor}`,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: sevColor,
            marginBottom: 8,
          }}
        >
          ⚠ {isAr ? 'حالة طارئة' : 'Emergency'}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>
          {isAr ? 'حالة جديدة' : 'New case'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
          {caseData.id.slice(0, 12)}
        </div>
        <div style={{ marginTop: 8 }}>
          <Badge tone={caseData.severity === 'CRITICAL' ? 'critical' : 'serious'} dot>
            {caseData.severity}
          </Badge>
        </div>
      </Card>

      <Card style={{ padding: 16, marginBottom: 16 }}>
        <Row icon={<IconPin size={14} />} label={t('location')} value={caseData.address} />
        <Row icon={<IconTarget size={14} />} label={t('eta')} value={caseData.ambulanceEta ?? '—'} />
        <Row icon={<IconHeart size={14} />} label={t('patient_condition')} value={caseData.notes ?? '—'} last />
      </Card>

      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="secondary" full size="lg" onClick={onDecline} loading={working} icon={<IconX size={16} />}>
          {t('reject_alert')}
        </Button>
        <Button variant="danger" full size="lg" onClick={onAccept} loading={working} icon={<IconCheck size={16} />}>
          {t('accept_alert')}
        </Button>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        padding: '10px 0',
        borderBottom: last ? 'none' : '1px solid var(--border)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <span style={{ color: 'var(--muted)', marginTop: 2 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 10.5,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 600,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
      </div>
    </div>
  );
}
