import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '../lib/api';
import { closeCase, getCase, updateAmbulanceInfo, updateCaseStatus } from '../lib/cases';
import { nearbyDonators } from '../lib/dispatch';
import { useI18n } from '../lib/i18n';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Input,
  SectionTitle,
  SeverityChip,
  StatusChip,
} from '../components/common/primitives';
import {
  IconAmbulance,
  IconCheck,
  IconChevron,
  IconPhone,
  IconRadio,
  IconShield,
  IconX,
} from '../components/common/Icons';
import { MapView } from '../components/common/MapView';
import type { CaseStatus, EmergencyCase, NearbyDonator } from '../types';
import { differenceInMinutes } from 'date-fns';

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, isAr, num, tpl } = useI18n();
  const justCreated = (location.state as { justCreated?: boolean } | null)?.justCreated;
  const [data, setData] = useState<EmergencyCase | null>(null);
  const [nearby, setNearby] = useState<NearbyDonator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClose, setShowClose] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [closing, setClosing] = useState(false);
  const [showAmbulance, setShowAmbulance] = useState(false);
  const [ambPlate, setAmbPlate] = useState('');
  const [ambEta, setAmbEta] = useState('');
  const [ambCrew, setAmbCrew] = useState('');
  const [savingAmb, setSavingAmb] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const c = await getCase(id);
      setData(c);
      if (c.status === 'OPEN' || c.status === 'ASSIGNED') {
        try {
          const list = await nearbyDonators(id);
          setNearby(list);
        } catch {
          setNearby([]);
        }
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, t('error_generic')));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 15000);
    return () => clearInterval(i);
  }, [refresh]);

  const handleStatus = async (next: CaseStatus) => {
    if (!id) return;
    try {
      const updated = await updateCaseStatus(id, next);
      setData(updated);
      toast.success(`Status → ${next}`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const handleClose = async () => {
    if (!id || !outcome.trim()) return;
    setClosing(true);
    try {
      const updated = await closeCase(id, outcome.trim());
      setData(updated);
      setShowClose(false);
      toast.success(isAr ? 'تم إغلاق الحالة' : 'Case closed');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setClosing(false);
    }
  };

  const handleAmbulance = async () => {
    if (!id) return;
    setSavingAmb(true);
    try {
      const updated = await updateAmbulanceInfo(id, {
        plate: ambPlate || undefined,
        eta: ambEta || undefined,
        crew: ambCrew || undefined,
      });
      setData(updated);
      setShowAmbulance(false);
      toast.success(isAr ? 'تم التحديث' : 'Updated');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSavingAmb(false);
    }
  };

  const openedAgo = useMemo(() => {
    if (!data) return '';
    const mins = differenceInMinutes(new Date(), new Date(data.createdAt));
    if (mins < 1) return t('just_now');
    if (mins < 60) return tpl('minutes_ago', { m: num(mins) });
    return tpl('hours_ago', { h: num(Math.floor(mins / 60)) });
  }, [data, t, tpl, num]);

  if (loading && !data) {
    return (
      <div style={{ padding: 40, color: 'var(--muted)' }}>{t('loading')}</div>
    );
  }
  if (!data) {
    return (
      <div style={{ padding: 40, color: 'var(--muted)' }}>{t('no_data')}</div>
    );
  }

  const mapCases = [
    {
      id: data.id,
      latitude: data.latitude,
      longitude: data.longitude,
      severity: data.severity,
    },
  ];

  const mapVolunteers = nearby
    .filter((n) => n.latitude && n.longitude)
    .map((n) => ({ id: n.id, latitude: n.latitude, longitude: n.longitude, responding: false }));

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 13,
          color: 'var(--muted)',
          marginBottom: 12,
        }}
      >
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
        <span style={{ color: 'var(--ink)' }}>
          {t('case_detail_title')} {data.id.slice(0, 8)}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                color: 'var(--muted)',
                fontWeight: 600,
              }}
            >
              {data.id.slice(0, 12)}
            </span>
            <SeverityChip level={data.severity} />
            <StatusChip status={data.status} />
            {justCreated && (
              <Badge tone="accent" dot>
                {isAr ? 'أُنشئت الآن' : 'Just dispatched'}
              </Badge>
            )}
            {data.panicTriggered && <Badge tone="critical" dot>PANIC</Badge>}
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{data.address}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {data.latitude.toFixed(4)}° N, {data.longitude.toFixed(4)}° E · {isAr ? 'فُتحت' : 'Opened'} {openedAgo}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {data.createdBy?.email && (
            <Button variant="secondary" icon={<IconPhone size={15} />} onClick={() => window.open(`mailto:${data.createdBy?.email}`)}>
              {t('call_reporter')}
            </Button>
          )}
          {(data.status === 'ASSIGNED' || data.status === 'ON_SCENE') && (
            <Button variant="secondary" icon={<IconAmbulance size={15} />} onClick={() => setShowAmbulance((v) => !v)}>
              {isAr ? 'معلومات الإسعاف' : 'Ambulance info'}
            </Button>
          )}
          {data.status === 'ASSIGNED' && (
            <Button variant="secondary" icon={<IconRadio size={15} />} onClick={() => handleStatus('ON_SCENE')}>
              {isAr ? 'وصل للموقع' : 'On scene'}
            </Button>
          )}
          {data.status !== 'CLOSED' && data.status !== 'EXPIRED' && (
            <Button variant="danger" icon={<IconX size={15} />} onClick={() => setShowClose(true)}>
              {t('close_case')}
            </Button>
          )}
        </div>
      </div>

      {showAmbulance && (
        <Card style={{ marginBottom: 16 }}>
          <SectionTitle>{isAr ? 'معلومات الإسعاف' : 'Ambulance info'}</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <Input label="Plate" value={ambPlate} onChange={(e) => setAmbPlate(e.target.value)} placeholder="ABC-1234" />
            <Input label="ETA" value={ambEta} onChange={(e) => setAmbEta(e.target.value)} placeholder="12 min" />
            <Input label="Crew" value={ambCrew} onChange={(e) => setAmbCrew(e.target.value)} placeholder="Team Alpha" />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Button onClick={handleAmbulance} loading={savingAmb} icon={<IconCheck size={15} />}>
              {isAr ? 'حفظ' : 'Save'}
            </Button>
            <Button variant="ghost" onClick={() => setShowAmbulance(false)}>
              {t('cancel')}
            </Button>
          </div>
        </Card>
      )}

      {showClose && (
        <Card style={{ marginBottom: 16 }}>
          <SectionTitle>{t('close_case')}</SectionTitle>
          <textarea
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder={isAr ? 'وصف نتيجة الحالة…' : 'Describe the case outcome…'}
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
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Button variant="danger" onClick={handleClose} loading={closing} disabled={!outcome.trim()}>
              {t('close_case')}
            </Button>
            <Button variant="ghost" onClick={() => setShowClose(false)}>
              {t('cancel')}
            </Button>
          </div>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <MapView
            cases={mapCases}
            volunteers={mapVolunteers}
            pulseCase={data.id}
            height={460}
            center={[data.latitude, data.longitude]}
          />

          {data.assignedTo && (
            <Card
              style={{
                position: 'absolute',
                top: 16,
                insetInlineStart: 16,
                padding: 14,
                width: 280,
                boxShadow: 'var(--shadow-md)',
                zIndex: 2,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                {t('responder')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Avatar name={data.assignedTo.name} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{data.assignedTo.name}</div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: 'var(--muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <IconShield size={11} /> {t('certified')}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {data.ambulanceEta && (
            <div
              style={{
                position: 'absolute',
                bottom: 16,
                insetInlineEnd: 56,
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 999,
                padding: '8px 14px',
                boxShadow: 'var(--shadow-sm)',
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12.5,
              }}
            >
              <IconAmbulance size={16} style={{ color: 'var(--critical)' }} />
              <span style={{ color: 'var(--muted)' }}>{t('ambulance_eta')}:</span>
              <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{data.ambulanceEta}</span>
            </div>
          )}
        </div>

        <Card padded={false} style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{t('timeline')}</h3>
            <Badge tone="live" dot>
              {t('updates_live')}
            </Badge>
          </div>
          <div style={{ padding: 16, overflowY: 'auto', maxHeight: 400 }}>
            <TimelineEvent label={isAr ? 'تم إنشاء الحالة' : 'Case created'} by={data.createdBy?.name} time={openedAgo} active />
            {data.assignedTo && (
              <TimelineEvent label={isAr ? 'تم اعتماد المتطوع' : 'Volunteer assigned'} by={data.assignedTo.name} active />
            )}
            {data.status === 'ON_SCENE' && (
              <TimelineEvent label={isAr ? 'وصل للموقع' : 'On scene'} active />
            )}
            {data.ambulanceEta && (
              <TimelineEvent label={`${t('ambulance_eta')}: ${data.ambulanceEta}`} active />
            )}
            {data.closedAt && (
              <TimelineEvent label={t('status_closed')} by={data.outcome ?? undefined} active last />
            )}
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        <Card>
          <SectionTitle>{isAr ? 'تفاصيل' : 'Details'}</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <DetailRow label={t('addr_label')} value={data.address} />
            <DetailRow label={t('lat_lng')} value={`${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}`} />
            <DetailRow label={t('severity')} value={<SeverityChip level={data.severity} />} />
            <DetailRow label={t('patient_condition')} value={data.notes ?? '—'} />
            {data.outcome && <DetailRow label="Outcome" value={data.outcome} />}
          </div>
          <Divider style={{ margin: '16px 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.status === 'ASSIGNED' && (
              <Button variant="primary" full icon={<IconCheck size={15} />} onClick={() => handleStatus('ON_SCENE')}>
                {isAr ? 'وصل للموقع' : 'Mark on-scene'}
              </Button>
            )}
            {(data.status === 'ASSIGNED' || data.status === 'ON_SCENE') && (
              <Button variant="secondary" full icon={<IconAmbulance size={15} />} onClick={() => setShowAmbulance(true)}>
                {isAr ? 'تحديث الإسعاف' : 'Update ambulance'}
              </Button>
            )}
          </div>
        </Card>

        <Card padded={false}>
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{t('matched_volunteers')}</h3>
            <Badge tone="neutral">{num(nearby.length)}</Badge>
          </div>
          {nearby.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
              {data.status === 'CLOSED' || data.status === 'EXPIRED' ? t('no_data') : isAr ? 'لا يوجد متطوعون قريبون.' : 'No nearby volunteers.'}
            </div>
          ) : (
            nearby.map((v, i) => (
              <div
                key={v.id}
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  borderBottom: i === nearby.length - 1 ? 'none' : '1px solid var(--border)',
                  background: data.assignedToId === v.id ? 'var(--accent-soft)' : 'transparent',
                }}
              >
                <Avatar name={v.name} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{v.name}</div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: 'var(--muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <IconShield size={11} /> {t('certified')}
                  </div>
                </div>
                <div
                  style={{
                    textAlign: isAr ? 'start' : 'end',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{tpl('dist_away', { d: num(v.distanceKm.toFixed(1)) })}</div>
                  <div style={{ color: 'var(--muted)' }}>{tpl('eta_min', { m: num(v.etaMinutes) })}</div>
                </div>
                <div style={{ width: 100, textAlign: isAr ? 'start' : 'end' }}>
                  {data.assignedToId === v.id ? (
                    <Badge tone="accent" dot>
                      {t('accepted')}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">{t('pending')}</Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 600,
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink)' }}>{value}</div>
    </div>
  );
}

function TimelineEvent({
  label,
  by,
  time,
  active,
  last,
}: {
  label: string;
  by?: string | null;
  time?: string;
  active?: boolean;
  last?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: last ? 0 : 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: active ? 'var(--accent)' : 'var(--panel)',
            border: `2px solid ${active ? 'var(--accent)' : 'var(--border-strong)'}`,
            marginTop: 4,
          }}
        />
        {!last && (
          <div
            style={{
              flex: 1,
              width: 2,
              background: active ? 'var(--accent)' : 'var(--border)',
              marginTop: 2,
              minHeight: 20,
              opacity: active ? 0.4 : 1,
            }}
          />
        )}
      </div>
      <div style={{ flex: 1, paddingBottom: 4 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: active ? 600 : 500,
            color: active ? 'var(--ink)' : 'var(--muted)',
          }}
        >
          {label}
        </div>
        {(by || time) && (
          <div
            style={{
              fontSize: 11.5,
              color: 'var(--muted)',
              marginTop: 2,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {[by, time].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
    </div>
  );
}
