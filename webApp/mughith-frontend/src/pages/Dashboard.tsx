import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '../lib/api';
import { listCases } from '../lib/cases';
import { listDonators } from '../lib/users';
import { useI18n } from '../lib/i18n';
import { useStore } from '../store/useStore';
import { Avatar, Badge, Button, Card, SeverityChip, StatCard, StatusChip } from '../components/common/primitives';
import { IconChevron, IconPlus, IconSearch } from '../components/common/Icons';
import { MapView } from '../components/common/MapView';
import type { EmergencyCase } from '../types';
import { donatorState } from '../lib/geo';
import { differenceInMinutes } from 'date-fns';

type Filter = 'all' | 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

const FILTERS: { k: Filter; labelKey: string }[] = [
  { k: 'all', labelKey: 'filter_all' },
  { k: 'CRITICAL', labelKey: 'filter_critical' },
  { k: 'HIGH', labelKey: 'filter_serious' },
  { k: 'MODERATE', labelKey: 'filter_moderate' },
  { k: 'LOW', labelKey: 'filter_low' },
];

export default function Dashboard() {
  const { t, isAr, num, tpl } = useI18n();
  const navigate = useNavigate();
  const setCases = useStore((s) => s.setCases);
  const cases = useStore((s) => s.cases);
  const setDonators = useStore((s) => s.setDonators);
  const donators = useStore((s) => s.donators);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [openRes, assignedRes, onSceneRes, donatorRes] = await Promise.all([
        listCases({ status: 'OPEN', page: 1, limit: 50 }),
        listCases({ status: 'ASSIGNED', page: 1, limit: 50 }),
        listCases({ status: 'ON_SCENE', page: 1, limit: 50 }),
        listDonators({ page: 1, limit: 50 }),
      ]);
      setCases([...openRes.data, ...assignedRes.data, ...onSceneRes.data]);
      setDonators(donatorRes.data);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('error_generic')));
    } finally {
      setLoading(false);
    }
  }, [setCases, setDonators, t]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, [refresh]);

  const activeStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = cases.filter((c) => new Date(c.createdAt) >= today).length;
    const available = donators.filter((d) => donatorState(d) === 'AVAILABLE').length;
    const closed = cases.filter((c) => c.closedAt && c.assignedToId);
    let avgMins = 0;
    if (closed.length) {
      const totalMs = closed.reduce(
        (acc, c) => acc + (new Date(c.closedAt!).getTime() - new Date(c.createdAt).getTime()),
        0,
      );
      avgMins = totalMs / closed.length / 1000 / 60;
    }
    const mm = Math.floor(avgMins);
    const ss = Math.round((avgMins - mm) * 60);
    const avgString = avgMins > 0 ? `${mm}:${String(ss).padStart(2, '0')}` : '—';
    return { active: cases.length, volunteers: available, avgResponse: avgString, today: todayCount };
  }, [cases, donators]);

  const filtered = useMemo(() => {
    const lowQ = query.trim().toLowerCase();
    return cases.filter((c) => {
      if (filter !== 'all' && c.severity !== filter) return false;
      if (lowQ) {
        return (
          c.address.toLowerCase().includes(lowQ) ||
          c.id.toLowerCase().includes(lowQ) ||
          (c.notes ?? '').toLowerCase().includes(lowQ)
        );
      }
      return true;
    });
  }, [cases, filter, query]);

  const mapCases = useMemo(
    () =>
      cases.map((c) => ({
        id: c.id,
        latitude: c.latitude,
        longitude: c.longitude,
        severity: c.severity,
      })),
    [cases],
  );

  const mapVolunteers = useMemo(
    () =>
      donators
        .filter((d) => d.latitude != null && d.longitude != null)
        .map((d) => ({
          id: d.id,
          latitude: d.latitude as number,
          longitude: d.longitude as number,
          responding: d.isBusy,
        })),
    [donators],
  );

  const td: CSSProperties = {
    padding: '12px 18px',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle',
  };

  const onCaseClick = (c: EmergencyCase) => {
    setSelected(c.id);
    navigate(`/cases/${c.id}`);
  };

  const openedAgo = (c: EmergencyCase) => {
    const mins = differenceInMinutes(new Date(), new Date(c.createdAt));
    if (mins < 1) return t('just_now');
    if (mins < 60) return tpl('minutes_ago', { m: num(mins) });
    return tpl('hours_ago', { h: num(Math.floor(mins / 60)) });
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 16,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>{t('dash_title')}</h1>
            <Badge tone="live" dot>
              {t('updates_live')}
            </Badge>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>{t('dash_sub')}</p>
        </div>
        <Button icon={<IconPlus size={16} />} onClick={() => navigate('/create-case')}>
          {t('new_case')}
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label={t('active_cases')} value={num(activeStats.active)} accent />
        <StatCard
          label={t('available_volunteers')}
          value={num(activeStats.volunteers)}
          sub={isAr ? 'ضمن المنطقة' : 'within region'}
        />
        <StatCard label={t('avg_response')} value={activeStats.avgResponse} sub={isAr ? 'اليوم' : 'today'} />
        <StatCard label={t('cases_today')} value={num(activeStats.today)} sub={isAr ? 'منذ ٠٠:٠٠' : 'since 00:00'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 16 }}>
        <MapView
          cases={mapCases}
          volunteers={mapVolunteers}
          selected={selected}
          onSelectCase={setSelected}
          height={520}
        />
        <Card padded={false} style={{ display: 'flex', flexDirection: 'column', maxHeight: 520 }}>
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{t('active_cases')}</h3>
              <Badge tone="neutral">{num(filtered.length)}</Badge>
            </div>
            <Badge tone="live" dot>
              {t('updates_live')}
            </Badge>
          </div>
          <div style={{ overflowY: 'auto', padding: 8 }}>
            {filtered.length === 0 && !loading && (
              <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>{t('no_data')}</div>
            )}
            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => onCaseClick(c)}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: `1px solid ${selected === c.id ? 'var(--accent)' : 'transparent'}`,
                  background: selected === c.id ? 'var(--accent-soft)' : 'transparent',
                  marginBottom: 4,
                  transition: 'all 120ms ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: 'var(--ink-2)',
                    }}
                  >
                    {c.id.slice(0, 8)}
                  </span>
                  <SeverityChip level={c.severity} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 6, fontWeight: 500 }}>{c.address}</div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 11.5,
                    color: 'var(--muted)',
                  }}
                >
                  <StatusChip status={c.status} />
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{openedAgo(c)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card padded={false} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {FILTERS.map((f) => (
              <button
                key={f.k}
                onClick={() => setFilter(f.k)}
                style={{
                  height: 32,
                  padding: '0 12px',
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
                {t(f.labelKey)}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ position: 'relative', width: 260 }}>
              <span
                style={{
                  position: 'absolute',
                  top: '50%',
                  insetInlineStart: 10,
                  transform: 'translateY(-50%)',
                  color: 'var(--muted)',
                }}
              >
                <IconSearch size={14} />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('search_cases')}
                style={{
                  width: '100%',
                  height: 32,
                  borderRadius: 6,
                  border: '1px solid var(--border-strong)',
                  background: 'var(--panel)',
                  paddingInlineStart: 32,
                  paddingInlineEnd: 10,
                  fontSize: 13,
                  color: 'var(--ink)',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr
                style={{
                  color: 'var(--muted)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {[t('case_id'), t('severity'), t('location'), t('status'), t('responder'), t('eta'), t('opened'), ''].map(
                  (h, i) => (
                    <th
                      key={i}
                      style={{
                        textAlign: isAr ? 'right' : 'left',
                        padding: '10px 18px',
                        fontWeight: 600,
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} style={{ ...td, textAlign: 'center', color: 'var(--muted)', padding: 32 }}>
                    {t('no_data')}
                  </td>
                </tr>
              )}
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => onCaseClick(c)}
                  style={{
                    cursor: 'pointer',
                    background: selected === c.id ? 'var(--accent-soft)' : 'transparent',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={(e) => {
                    if (selected !== c.id)
                      (e.currentTarget as HTMLTableRowElement).style.background = 'var(--panel-2)';
                  }}
                  onMouseLeave={(e) => {
                    if (selected !== c.id)
                      (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                  }}
                >
                  <td style={td}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 600 }}>
                      {c.id.slice(0, 8)}
                    </span>
                  </td>
                  <td style={td}>
                    <SeverityChip level={c.severity} />
                  </td>
                  <td style={td}>{c.address}</td>
                  <td style={td}>
                    <StatusChip status={c.status} />
                  </td>
                  <td style={td}>
                    {c.assignedTo ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={c.assignedTo.name} size={26} />
                        <span>{c.assignedTo.name}</span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>—</span>
                    )}
                  </td>
                  <td style={td}>
                    {c.ambulanceEta ? (
                      c.ambulanceEta
                    ) : c.status === 'ON_SCENE' ? (
                      <Badge tone="accent">{t('status_onscene')}</Badge>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ ...td, color: 'var(--muted)', fontSize: 12 }}>{openedAgo(c)}</td>
                  <td style={td}>
                    <IconChevron
                      size={14}
                      style={{ color: 'var(--muted)', transform: isAr ? 'scaleX(-1)' : 'none' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
