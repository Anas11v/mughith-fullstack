import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '../lib/api';
import { setAvailability, getProfile } from '../lib/users';
import { getCaseHistory } from '../lib/cases';
import { listNotifications } from '../lib/notifications';
import { useI18n } from '../lib/i18n';
import { useStore } from '../store/useStore';
import { Avatar, Badge, Button, Card } from '../components/common/primitives';
import { IconBell, IconRadio, IconShield } from '../components/common/Icons';
import type { EmergencyCase } from '../types';

export default function DonaterHome() {
  const { t, isAr, num } = useI18n();
  const navigate = useNavigate();
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);
  const [history, setHistory] = useState<EmergencyCase[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [me, hist, notifs] = await Promise.all([
        getProfile(),
        getCaseHistory().catch(() => [] as EmergencyCase[]),
        listNotifications(true).catch(() => []),
      ]);
      setUser(me);
      setHistory(hist);
      setUnreadAlerts(notifs.filter((n) => n.type === 'CASE_ALERT').length);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('error_generic')));
    }
  }, [setUser, t]);

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 15000);
    return () => clearInterval(i);
  }, [refresh]);

  const toggleAvailability = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updated = await setAvailability(!user.isAvailable);
      setUser(updated);
      toast.success(updated.isAvailable ? (isAr ? 'متاح الآن' : 'You are available') : (isAr ? 'غير متاح' : 'You are offline'));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;
  const available = user.isAvailable;
  const recent = history[0];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <Avatar name={user.name} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {isAr ? `مرحبًا، ${user.name}` : `Hi, ${user.name}`}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {user.certification ?? t('certified')} · {user.email}
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/vol/alert')}
          style={{
            position: 'relative',
            width: 40,
            height: 40,
            borderRadius: 20,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            color: 'var(--ink-2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconBell size={18} />
          {unreadAlerts > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                background: 'var(--critical)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                borderRadius: 999,
                padding: '1px 5px',
              }}
            >
              {num(unreadAlerts)}
            </span>
          )}
        </button>
      </div>

      <Card
        style={{
          padding: 20,
          borderRadius: 16,
          background: available
            ? 'linear-gradient(135deg, var(--accent), var(--accent-700))'
            : 'linear-gradient(135deg, #3C4540, #1f2724)',
          color: '#fff',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            opacity: 0.85,
            marginBottom: 6,
          }}
        >
          {isAr ? 'الحالة' : 'Status'}
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
          {available ? (isAr ? 'متاح للاستجابة' : 'Available to respond') : (isAr ? 'غير متصل' : 'Offline')}
        </div>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 16 }}>
          {available
            ? isAr
              ? 'سيتم إشعارك فور ورود حالة'
              : "You'll be notified when a case comes in"
            : isAr
              ? 'فعّل الاستعداد لتلقّي التنبيهات'
              : 'Go online to receive alerts'}
        </div>
        <Button
          variant="secondary"
          onClick={toggleAvailability}
          loading={saving}
          style={{
            background: 'rgba(255,255,255,0.18)',
            color: '#fff',
            borderColor: 'rgba(255,255,255,0.35)',
          }}
        >
          {available ? (isAr ? 'إيقاف الاستعداد' : 'Go offline') : isAr ? 'تفعيل الاستعداد' : 'Go online'}
        </Button>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <Card style={{ padding: 14 }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 4,
            }}
          >
            {isAr ? 'إجمالي' : 'Total'}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{num(history.length)}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{isAr ? 'حالة' : 'cases'}</div>
        </Card>
        <Card style={{ padding: 14 }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 4,
            }}
          >
            {isAr ? 'الشهادة' : 'Certification'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconShield size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 16, fontWeight: 700 }}>{user.certification ?? '—'}</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            {user.certExpiry ? new Date(user.certExpiry).toLocaleDateString() : (isAr ? 'بدون تاريخ' : 'No expiry')}
          </div>
        </Card>
      </div>

      <Button
        variant="outline"
        full
        icon={<IconRadio size={15} />}
        onClick={() => navigate('/vol/alert')}
      >
        {isAr ? 'فتح التنبيهات الواردة' : 'Open incoming alerts'}
      </Button>

      {recent && (
        <Card style={{ marginTop: 16, padding: 14 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 8,
            }}
          >
            {isAr ? 'آخر نشاط' : 'Recent'}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {recent.id.slice(0, 8)} · {recent.status}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            {recent.address}
          </div>
          <div style={{ marginTop: 6 }}>
            <Badge tone="accent">{recent.outcome ? (isAr ? 'تم التسليم' : 'Handed off') : recent.status}</Badge>
          </div>
        </Card>
      )}
    </div>
  );
}
