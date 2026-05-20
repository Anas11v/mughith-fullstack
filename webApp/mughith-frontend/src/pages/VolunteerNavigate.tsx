import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '../lib/api';
import { getCase } from '../lib/cases';
import { useI18n } from '../lib/i18n';
import { useStore } from '../store/useStore';
import { Button, Card } from '../components/common/primitives';
import { IconAmbulance, IconCheck, IconMail, IconPhone, IconRadio } from '../components/common/Icons';
import { MapView } from '../components/common/MapView';
import { getLocationSocket } from '../lib/socket';
import { haversineKm } from '../lib/geo';
import type { EmergencyCase } from '../types';

export default function VolunteerNavigate() {
  const { t, isAr } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useStore((s) => s.user);
  const activeCaseId = useStore((s) => s.activeCaseId);
  const setActiveCaseId = useStore((s) => s.setActiveCaseId);
  const [caseData, setCaseData] = useState<EmergencyCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const watchId = useRef<number | null>(null);

  const passedId = (location.state as { caseId?: string } | null)?.caseId;
  const targetId = passedId ?? activeCaseId ?? null;

  const loadAssignedCase = useCallback(async () => {
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
      } else {
        setCaseData(c);
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, t('error_generic')));
      setCaseData(null);
    } finally {
      setLoading(false);
    }
  }, [targetId, setActiveCaseId, t]);

  useEffect(() => {
    loadAssignedCase();
  }, [loadAssignedCase]);

  useEffect(() => {
    if (!caseData || !user) return;
    const socket = getLocationSocket();
    socket.emit('location:subscribe', { caseId: caseData.id });

    if ('geolocation' in navigator) {
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords([lat, lng]);
          socket.emit(
            'location:update',
            { caseId: caseData.id, latitude: lat, longitude: lng },
            (ack: { ok: boolean; distanceKm?: number; etaMinutes?: number; error?: string }) => {
              if (ack?.ok) {
                if (ack.distanceKm != null) setDistance(ack.distanceKm);
                if (ack.etaMinutes != null) setEta(ack.etaMinutes);
              }
            },
          );
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000 },
      );
    }

    return () => {
      socket.emit('location:unsubscribe', { caseId: caseData.id });
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [caseData, user]);

  const fallbackDist = useMemo(() => {
    if (!coords || !caseData) return null;
    return haversineKm(coords, [caseData.latitude, caseData.longitude]);
  }, [coords, caseData]);

  const onArrived = () => {
    if (caseData) navigate('/vol/onscene', { state: { caseId: caseData.id } });
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
              ? 'لا توجد حالة موكلة إليك حاليًا. افتح التنبيهات لقبول حالة جديدة.'
              : 'You do not have a case assigned. Open alerts to accept one.'}
          </p>
          <Button icon={<IconRadio size={15} />} onClick={() => navigate('/vol/alert')}>
            {isAr ? 'فتح التنبيهات' : 'Open alerts'}
          </Button>
        </Card>
      </div>
    );
  }

  const mapCases = [
    { id: caseData.id, latitude: caseData.latitude, longitude: caseData.longitude, severity: caseData.severity },
  ];
  const mapVolunteers = coords ? [{ id: 'me', latitude: coords[0], longitude: coords[1], responding: true }] : [];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <Card padded={false} style={{ overflow: 'hidden', marginBottom: 16 }}>
        <MapView cases={mapCases} volunteers={mapVolunteers} height={360} showLegend={false} center={[caseData.latitude, caseData.longitude]} />
      </Card>

      <Card style={{ marginBottom: 14, padding: 16 }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--muted)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {isAr ? 'التوجه إلى' : 'Heading to'}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{caseData.address}</div>
      </Card>

      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
        <BigStat label={t('eta')} value={eta != null ? String(eta) : '—'} unit={isAr ? 'د' : 'min'} />
        <BigStat
          label={isAr ? 'المسافة' : 'Distance'}
          value={distance != null ? distance.toFixed(1) : fallbackDist != null ? fallbackDist.toFixed(1) : '—'}
          unit={isAr ? 'كم' : 'km'}
        />
        <BigStat label={isAr ? 'الإسعاف' : 'Amb.'} value={caseData.ambulanceEta ?? '—'} unit="" muted />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <IconButton onClick={() => caseData.createdBy?.email && window.open(`mailto:${caseData.createdBy.email}`)}>
          <IconMail size={16} />
        </IconButton>
        <IconButton onClick={() => caseData.createdBy && window.open(`tel:${caseData.createdBy.id}`)}>
          <IconPhone size={16} />
        </IconButton>
        <IconButton>
          <IconAmbulance size={16} />
        </IconButton>
      </div>

      <Button full size="lg" icon={<IconCheck size={17} />} onClick={onArrived}>
        {t('arrived')}
      </Button>
    </div>
  );
}

function BigStat({ label, value, unit, muted }: { label: string; value: string; unit: string; muted?: boolean }) {
  return (
    <Card style={{ flex: 1, textAlign: 'center', padding: 12 }}>
      <div
        style={{
          fontSize: 10,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 600,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: muted ? 'var(--muted)' : 'var(--ink)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: 11, fontWeight: 500, marginInlineStart: 4, color: 'var(--muted)' }}>{unit}</span>
        )}
      </div>
    </Card>
  );
}

function IconButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        height: 44,
        borderRadius: 14,
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        color: 'var(--ink-2)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}
