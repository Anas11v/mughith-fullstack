import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '../lib/api';
import { createCase } from '../lib/cases';
import { listDonators } from '../lib/users';
import { donatorState, haversineKm } from '../lib/geo';
import type { User } from '../types';
import { useI18n } from '../lib/i18n';
import { Button, Card, Divider, Input, SectionTitle, Select, SeverityChip } from '../components/common/primitives';
import {
  IconAlert,
  IconArrow,
  IconCheck,
  IconChevron,
  IconPhone,
  IconPin,
  IconRadio,
  IconShield,
  IconTarget,
  IconUser,
} from '../components/common/Icons';
import { MapView } from '../components/common/MapView';
import type { SeverityLevel } from '../types';

type Severity = SeverityLevel;

export default function CreateCase() {
  const { t, isAr, num } = useI18n();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [addr, setAddr] = useState('');
  const [latitude, setLatitude] = useState<string>('21.4225');
  const [longitude, setLongitude] = useState<string>('39.8262');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('male');
  const [condition, setCondition] = useState('');
  const [contact, setContact] = useState('');
  const [severity, setSeverity] = useState<Severity>('CRITICAL');
  const [radius, setRadius] = useState(5);
  const [dispatching, setDispatching] = useState(false);
  const [donators, setDonators] = useState<User[]>([]);

  useEffect(() => {
    listDonators({ page: 1, limit: 100, available: true })
      .then((r) => setDonators(r.data))
      .catch(() => {});
  }, []);

  const steps: { k: number; label: string; icon: ReactNode }[] = [
    { k: 1, label: t('step_location'), icon: <IconPin size={14} /> },
    { k: 2, label: t('step_patient'), icon: <IconUser size={14} /> },
    { k: 3, label: t('step_severity'), icon: <IconAlert size={14} /> },
    { k: 4, label: t('step_review'), icon: <IconCheck size={14} /> },
  ];

  const lat = Number(latitude);
  const lng = Number(longitude);
  const coordsValid = !Number.isNaN(lat) && !Number.isNaN(lng);

  const eligibleVolunteers = donators
    .filter((d) => donatorState(d) === 'AVAILABLE' && d.latitude != null && d.longitude != null)
    .map((d) => ({
      id: d.id,
      latitude: d.latitude as number,
      longitude: d.longitude as number,
      responding: false,
    }));
  const inRangeCount = coordsValid
    ? eligibleVolunteers.filter(
        (v) => haversineKm([lat, lng], [v.latitude, v.longitude]) <= radius,
      ).length
    : 0;

  const buildNotes = () => {
    const parts: string[] = [];
    if (condition.trim()) parts.push(condition.trim());
    const meta: string[] = [];
    if (age) meta.push(`age:${age}`);
    if (sex) meta.push(`sex:${sex}`);
    if (contact) meta.push(`contact:${contact}`);
    if (meta.length) parts.push(`[${meta.join(' · ')}]`);
    return parts.join(' — ');
  };

  const doDispatch = async () => {
    if (!addr.trim()) {
      toast.error(isAr ? 'العنوان مطلوب' : 'Address required');
      setStep(1);
      return;
    }
    if (!condition.trim()) {
      toast.error(isAr ? 'وصف الحالة مطلوب' : 'Condition required');
      setStep(2);
      return;
    }
    setDispatching(true);
    try {
      const newCase = await createCase({
        address: addr.trim(),
        severity,
        notes: buildNotes(),
        radiusKm: radius,
        latitude: coordsValid ? lat : undefined,
        longitude: coordsValid ? lng : undefined,
      });
      toast.success(isAr ? 'تم إرسال الحالة' : 'Case dispatched');
      navigate(`/cases/${newCase.id}`, { state: { justCreated: true } });
    } catch (err) {
      toast.error(apiErrorMessage(err, isAr ? 'فشل إرسال الحالة' : 'Dispatch failed'));
    } finally {
      setDispatching(false);
    }
  };

  const Stepper = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        marginBottom: 24,
        padding: '16px 20px',
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
      }}
    >
      {steps.map((s, i) => (
        <div key={s.k} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1.5 : 'initial' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: step >= s.k ? 'var(--accent)' : 'var(--panel-2)',
                color: step >= s.k ? '#fff' : 'var(--muted)',
                border: `1px solid ${step >= s.k ? 'var(--accent)' : 'var(--border-strong)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {step > s.k ? <IconCheck size={14} /> : num(s.k)}
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                }}
              >
                {isAr ? `الخطوة ${num(s.k)}` : `Step ${num(s.k)}`}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: step >= s.k ? 'var(--ink)' : 'var(--muted)' }}>
                {s.label}
              </div>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div
              style={{
                flex: 1,
                height: 1,
                background: step > s.k ? 'var(--accent)' : 'var(--border)',
                marginInline: 12,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );

  const Step1 = (
    <Card>
      <SectionTitle subtitle={isAr ? 'اكتب العنوان أو ضع دبّوسًا على الخريطة' : 'Type the address or drop a pin on the map'}>
        {t('step_location')}
      </SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input
          label={`${t('addr_label')} *`}
          placeholder={t('addr_ph')}
          icon={<IconPin size={15} />}
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Latitude" value={latitude} onChange={(e) => setLatitude(e.target.value)} inputMode="decimal" />
          <Input label="Longitude" value={longitude} onChange={(e) => setLongitude(e.target.value)} inputMode="decimal" />
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          {isAr ? 'انقر على الخريطة لتحديد الموقع الدقيق' : 'Click on the map to set the exact location'}
        </div>
        <MapView
          height={320}
          showLegend
          volunteers={eligibleVolunteers}
          center={coordsValid ? [lat, lng] : undefined}
          pickedPoint={coordsValid ? [lat, lng] : null}
          onMapClick={(la, ln) => {
            setLatitude(la.toFixed(6));
            setLongitude(ln.toFixed(6));
          }}
        />
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            background: inRangeCount > 0 ? 'var(--accent-soft)' : 'var(--critical-soft)',
            color: inRangeCount > 0 ? 'var(--accent-ink)' : 'var(--critical)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {inRangeCount > 0
            ? isAr
              ? `${num(inRangeCount)} متطوع/متطوعون ضمن النطاق ${num(radius)} كم وسيتلقّون التنبيه`
              : `${num(inRangeCount)} volunteer${inRangeCount === 1 ? '' : 's'} within ${num(radius)} km — they will receive the alert`
            : isAr
              ? 'لا يوجد متطوّع ضمن النطاق. وسّع نصف القطر في الخطوة ٣ أو انقر أقرب إلى نقطة خضراء على الخريطة.'
              : 'No volunteers in range. Widen the radius in step 3 or click closer to a green dot on the map.'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<IconTarget size={14} />}
            onClick={() => {
              if (!('geolocation' in navigator)) {
                toast.error(isAr ? 'الموقع غير مدعوم' : 'Geolocation not supported');
                return;
              }
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setLatitude(pos.coords.latitude.toFixed(6));
                  setLongitude(pos.coords.longitude.toFixed(6));
                  toast.success(isAr ? 'تم تحديد موقعك' : 'Used your current location');
                },
                () => toast.error(isAr ? 'تعذّر تحديد الموقع' : 'Could not get your location'),
                { enableHighAccuracy: true, timeout: 8000 },
              );
            }}
          >
            {isAr ? 'استخدم موقعي' : 'Use my location'}
          </Button>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            padding: '10px 12px',
            background: 'var(--accent-soft)',
            borderRadius: 8,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--accent-ink)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <IconPin size={14} />
            {isAr ? 'الموقع المحدد' : 'Selected location'}
          </div>
          <Divider vertical style={{ height: 16, background: 'var(--accent)', opacity: 0.2 }} />
          <div style={{ fontSize: 12, color: 'var(--accent-ink)', fontFamily: 'var(--font-mono)' }}>
            {Number(latitude).toFixed(4)}° N, {Number(longitude).toFixed(4)}° E
          </div>
          <div style={{ flex: 1 }} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--accent-ink)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <IconShield size={13} />
            {t('zone_ok')}
          </div>
        </div>
      </div>
    </Card>
  );

  const Step2 = (
    <Card>
      <SectionTitle>{t('step_patient')}</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Input label={t('patient_age')} value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" />
        <Select
          label={t('patient_sex')}
          value={sex}
          onChange={(e) => setSex(e.target.value)}
          options={[
            { value: 'male', label: t('patient_male') },
            { value: 'female', label: t('patient_female') },
            { value: 'unknown', label: t('patient_unknown') },
          ]}
        />
      </div>
      <div style={{ marginTop: 14 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6, display: 'block' }}>
          {t('patient_condition')} *
        </label>
        <textarea
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          placeholder={t('patient_condition_ph')}
          rows={4}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid var(--border-strong)',
            background: 'var(--panel)',
            fontSize: 14,
            color: 'var(--ink)',
            fontFamily: 'inherit',
            resize: 'vertical',
            outline: 'none',
          }}
        />
      </div>
      <div style={{ marginTop: 14 }}>
        <Input
          label={t('patient_contact')}
          icon={<IconPhone size={15} />}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="+966 5X XXX XXXX"
        />
      </div>
    </Card>
  );

  const sevOptions: { k: Severity; label: string; desc: string; color: string; soft: string }[] = [
    { k: 'CRITICAL', label: t('sev_critical'), desc: t('sev_critical_desc'), color: 'var(--critical)', soft: 'var(--critical-soft)' },
    { k: 'HIGH', label: t('sev_high'), desc: t('sev_serious_desc'), color: 'var(--serious)', soft: 'var(--serious-soft)' },
    { k: 'MODERATE', label: t('sev_moderate'), desc: t('sev_moderate_desc'), color: 'var(--moderate)', soft: 'var(--moderate-soft)' },
    { k: 'LOW', label: t('sev_low'), desc: t('sev_low_desc'), color: 'var(--muted)', soft: 'var(--panel-2)' },
  ];

  const Step3 = (
    <Card>
      <SectionTitle>{t('step_severity')}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sevOptions.map((o) => (
          <button
            key={o.k}
            onClick={() => setSeverity(o.k)}
            style={{
              padding: 14,
              borderRadius: 8,
              cursor: 'pointer',
              textAlign: 'start',
              border: `1px solid ${severity === o.k ? o.color : 'var(--border-strong)'}`,
              background: severity === o.k ? o.soft : 'var(--panel)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              fontFamily: 'inherit',
              boxShadow: severity === o.k ? `0 0 0 3px ${o.soft}` : 'none',
              transition: 'all 120ms ease',
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: `2px solid ${severity === o.k ? o.color : 'var(--border-strong)'}`,
                flexShrink: 0,
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {severity === o.k && (
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: o.color }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: o.color, marginBottom: 2 }}>{o.label}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{o.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6, display: 'block' }}>
          {t('radius_label')}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="range"
            min="0.5"
            max="20"
            step="0.5"
            value={radius}
            onChange={(e) => setRadius(+e.target.value)}
            style={{ flex: 1, accentColor: 'var(--accent)' }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 600,
              minWidth: 60,
              textAlign: 'end',
            }}
          >
            {num(radius)} {isAr ? 'كم' : 'km'}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>
          {isAr
            ? 'تلميح: المتطوّعون التجريبيون يقعون قرب ٢١٫٤٢° شمال، ٣٩٫٨٣° شرق (وسط مكة).'
            : 'Tip: seeded volunteers sit near 21.42°N, 39.83°E (central Makkah). Click closer to that point or widen the radius.'}
        </div>
      </div>
    </Card>
  );

  const ReviewRow = ({
    label,
    value,
    icon,
    mono,
    last,
  }: {
    label: string;
    value: ReactNode;
    icon?: ReactNode;
    mono?: boolean;
    last?: boolean;
  }) => (
    <div style={{ padding: '12px 16px', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <div
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 4,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {icon} {label}
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink)', fontFamily: mono ? 'var(--font-mono)' : 'inherit', fontWeight: 500 }}>
        {value}
      </div>
    </div>
  );

  const Step4 = (
    <Card>
      <SectionTitle subtitle={t('review_warn')}>{t('review_title')}</SectionTitle>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
          border: '1px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <ReviewRow label={t('addr_label')} value={addr || '—'} icon={<IconPin size={14} />} />
        <ReviewRow label={t('lat_lng')} value={`${latitude}° N, ${longitude}° E`} mono />
        <ReviewRow
          label={t('patient_age')}
          value={
            age
              ? `${num(age)} · ${sex === 'male' ? t('patient_male') : sex === 'female' ? t('patient_female') : t('patient_unknown')}`
              : '—'
          }
        />
        <ReviewRow label={t('patient_condition')} value={condition || <span style={{ color: 'var(--muted)' }}>—</span>} />
        <ReviewRow label={t('severity')} value={<SeverityChip level={severity} />} />
        <ReviewRow label={t('radius_label')} value={`${num(radius)} ${isAr ? 'كم' : 'km'}`} mono />
        <ReviewRow label={t('patient_contact')} value={contact || '—'} icon={<IconPhone size={14} />} last />
        <ReviewRow label="" value="" last />
      </div>
      <div
        style={{
          marginTop: 16,
          padding: '12px 14px',
          background: 'var(--critical-soft)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <IconAlert size={16} style={{ color: 'var(--critical)', marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: 'var(--critical)', lineHeight: 1.5 }}>{t('review_warn')}</div>
      </div>
    </Card>
  );

  const current = step === 1 ? Step1 : step === 2 ? Step2 : step === 3 ? Step3 : Step4;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--muted)',
            padding: 0,
            fontFamily: 'inherit',
            fontSize: 13,
          }}
        >
          {t('nav_dashboard')}
        </button>
        <IconChevron size={12} style={{ transform: isAr ? 'scaleX(-1)' : 'none' }} />
        <span style={{ color: 'var(--ink)' }}>{t('new_title')}</span>
      </div>
      <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>{t('new_title')}</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--muted)' }}>{t('new_sub')}</p>

      {Stepper}
      {current}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
        <Button variant="ghost" onClick={() => (step === 1 ? navigate('/dashboard') : setStep(step - 1))}>
          {step === 1 ? t('cancel') : t('back')}
        </Button>
        <div style={{ flex: 1 }} />
        {step < 4 ? (
          <Button
            onClick={() => {
              if (step === 1 && !addr.trim()) {
                toast.error(isAr ? 'العنوان مطلوب' : 'Address required');
                return;
              }
              if (step === 2 && !condition.trim()) {
                toast.error(isAr ? 'وصف الحالة مطلوب' : 'Condition required');
                return;
              }
              setStep(step + 1);
            }}
            iconEnd={<IconArrow size={15} style={{ transform: isAr ? 'scaleX(-1)' : 'none' }} />}
          >
            {t('next')}
          </Button>
        ) : (
          <Button
            variant="danger"
            onClick={doDispatch}
            loading={dispatching}
            icon={!dispatching ? <IconRadio size={15} /> : undefined}
          >
            {dispatching ? t('dispatching') : t('dispatch')}
          </Button>
        )}
      </div>
    </div>
  );
}
