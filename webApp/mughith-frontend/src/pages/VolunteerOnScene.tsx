import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '../lib/api';
import { getCase, updateCaseStatus } from '../lib/cases';
import { useI18n } from '../lib/i18n';
import { useStore } from '../store/useStore';
import { Button, Card } from '../components/common/primitives';
import { IconAmbulance, IconCheck, IconRadio } from '../components/common/Icons';
import type { EmergencyCase } from '../types';

interface Vitals {
  hr: string;
  bp: string;
  spo2: string;
  gcs: string;
}

export default function VolunteerOnScene() {
  const { t, isAr } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const activeCaseId = useStore((s) => s.activeCaseId);
  const setActiveCaseId = useStore((s) => s.setActiveCaseId);
  const [caseData, setCaseData] = useState<EmergencyCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [vitals, setVitals] = useState<Vitals>({ hr: '', bp: '', spo2: '', gcs: '' });
  const [actions, setActions] = useState<boolean[]>([false, false, false, false]);
  const [stabilized, setStabilized] = useState(false);
  const [working, setWorking] = useState(false);

  const passedId = (location.state as { caseId?: string } | null)?.caseId;
  const targetId = passedId ?? activeCaseId ?? null;

  useEffect(() => {
    (async () => {
      if (!targetId) {
        setCaseData(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const c = await getCase(targetId);
        if (c.status === 'CLOSED' || c.status === 'EXPIRED') {
          setActiveCaseId(null);
          setCaseData(null);
          return;
        }
        setCaseData(c);
        if (c.status === 'ASSIGNED') {
          await updateCaseStatus(c.id, 'ON_SCENE').catch(() => {});
        }
      } catch (err) {
        toast.error(apiErrorMessage(err, t('error_generic')));
        setCaseData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [targetId, setActiveCaseId, t]);

  const actionsList = isAr
    ? ['تم فحص المجرى الهوائي', 'وضع الضحية في وضعية آمنة', 'تم إعطاء الأكسجين', 'السيطرة على النزيف']
    : ['Airway assessed', 'Recovery position', 'Oxygen administered', 'Bleeding controlled'];

  const onHandoff = async () => {
    if (!caseData) return;
    setWorking(true);
    try {
      await updateCaseStatus(caseData.id, 'CLOSED');
      setActiveCaseId(null);
      toast.success(isAr ? 'تم تسليم الحالة وإغلاقها' : 'Case handed off and closed');
      navigate('/vol/history');
    } catch (err) {
      toast.error(apiErrorMessage(err, isAr ? 'فشل إغلاق الحالة' : 'Failed to close case'));
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--muted)' }}>{t('loading')}</div>;
  }

  if (!caseData) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        <Card style={{ padding: 40 }}>
          <div style={{ color: 'var(--muted)', fontSize: 32, marginBottom: 12 }}>—</div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {isAr ? 'لا توجد حالة نشطة' : 'No active case'}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '8px 0 16px' }}>
            {isAr
              ? 'افتح التنبيهات لقبول حالة جديدة.'
              : 'Open alerts to accept a new case.'}
          </p>
          <Button icon={<IconRadio size={15} />} onClick={() => navigate('/vol/alert')}>
            {isAr ? 'فتح التنبيهات' : 'Open alerts'}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card
        style={{
          padding: 14,
          background: 'var(--accent-soft)',
          border: '1px solid var(--accent)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: 5, background: 'var(--accent)', animation: 'blink 1.4s infinite' }} />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--accent-ink)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {t('status_onscene')}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {caseData.id.slice(0, 8)} · {caseData.address}
          </div>
        </div>
      </Card>

      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 8,
          }}
        >
          {t('vitals')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Vital label={t('hr')} value={vitals.hr} unit="bpm" onChange={(v) => setVitals({ ...vitals, hr: v })} />
          <Vital label={t('bp')} value={vitals.bp} unit="mmHg" onChange={(v) => setVitals({ ...vitals, bp: v })} />
          <Vital label={t('spo2')} value={vitals.spo2} unit="%" onChange={(v) => setVitals({ ...vitals, spo2: v })} />
          <Vital label={t('gcs')} value={vitals.gcs} unit="/15" onChange={(v) => setVitals({ ...vitals, gcs: v })} />
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 8,
          }}
        >
          {t('actions_checklist')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {actionsList.map((a, i) => (
            <Check
              key={i}
              label={a}
              checked={actions[i]}
              onToggle={() => setActions((prev) => prev.map((p, idx) => (idx === i ? !p : p)))}
            />
          ))}
        </div>
      </div>

      <label
        onClick={() => setStabilized(!stabilized)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: 12,
          borderRadius: 12,
          background: stabilized ? 'var(--accent-soft)' : 'var(--panel)',
          border: `1px solid ${stabilized ? 'var(--accent)' : 'var(--border)'}`,
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: `2px solid ${stabilized ? 'var(--accent)' : 'var(--border-strong)'}`,
            background: stabilized ? 'var(--accent)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}
        >
          {stabilized && <IconCheck size={12} />}
        </div>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{t('stabilized')}</span>
      </label>

      <Button
        full
        size="lg"
        onClick={onHandoff}
        disabled={!stabilized}
        loading={working}
        icon={<IconAmbulance size={16} />}
      >
        {t('handoff')}
      </Button>
    </div>
  );
}

function Vital({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: string;
  unit: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ padding: 10, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10 }}>
      <div
        style={{
          fontSize: 10.5,
          color: 'var(--muted)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--ink)',
            background: 'transparent',
            fontFamily: 'var(--font-mono)',
            padding: 0,
          }}
        />
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{unit}</span>
      </div>
    </div>
  );
}

function Check({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        padding: '10px 12px',
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          border: `2px solid ${checked ? 'var(--accent)' : 'var(--border-strong)'}`,
          background: checked ? 'var(--accent)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
        }}
      >
        {checked && <IconCheck size={10} />}
      </div>
      <span style={{ fontSize: 13, color: checked ? 'var(--ink)' : 'var(--muted)', fontWeight: 500 }}>{label}</span>
    </div>
  );
}
