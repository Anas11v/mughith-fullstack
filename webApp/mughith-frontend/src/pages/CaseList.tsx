import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '../lib/api';
import { listCases } from '../lib/cases';
import { useI18n } from '../lib/i18n';
import { Avatar, Button, Card, SeverityChip, StatusChip } from '../components/common/primitives';
import { IconChevron, IconPlus, IconSearch } from '../components/common/Icons';
import type { EmergencyCase } from '../types';
import { differenceInMinutes } from 'date-fns';

type Tab = 'active' | 'closed' | 'all';
type Filter = 'all' | 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export default function CaseList() {
  const { t, isAr, num, tpl } = useI18n();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('active');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeCases, setActiveCases] = useState<EmergencyCase[]>([]);
  const [closedCases, setClosedCases] = useState<EmergencyCase[]>([]);
  const [tabAutoChosen, setTabAutoChosen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [openR, assignedR, onSceneR, closedR, expiredR] = await Promise.all([
        listCases({ status: 'OPEN', page: 1, limit: 100 }),
        listCases({ status: 'ASSIGNED', page: 1, limit: 100 }),
        listCases({ status: 'ON_SCENE', page: 1, limit: 100 }),
        listCases({ status: 'CLOSED', page: 1, limit: 100 }),
        listCases({ status: 'EXPIRED', page: 1, limit: 100 }),
      ]);
      setActiveCases([...openR.data, ...assignedR.data, ...onSceneR.data]);
      setClosedCases([...closedR.data, ...expiredR.data]);
    } catch (err) {
      toast.error(apiErrorMessage(err, t('error_generic')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // If we land with no active cases but there are closed/expired ones, jump to "All"
  // so the user immediately sees something instead of a blank "Active" tab.
  useEffect(() => {
    if (tabAutoChosen || loading) return;
    if (tab === 'active' && activeCases.length === 0 && closedCases.length > 0) {
      setTab('all');
    }
    setTabAutoChosen(true);
  }, [loading, activeCases.length, closedCases.length, tab, tabAutoChosen]);

  const tabFiltered = useMemo(() => {
    if (tab === 'active') return activeCases;
    if (tab === 'closed') return closedCases;
    return [...activeCases, ...closedCases];
  }, [tab, activeCases, closedCases]);

  const filtered = useMemo(() => {
    const lowQ = query.trim().toLowerCase();
    return tabFiltered.filter((c) => {
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
  }, [tabFiltered, filter, query]);

  const openedAgo = (c: EmergencyCase) => {
    const mins = differenceInMinutes(new Date(), new Date(c.createdAt));
    if (mins < 1) return t('just_now');
    if (mins < 60) return tpl('minutes_ago', { m: num(mins) });
    return tpl('hours_ago', { h: num(Math.floor(mins / 60)) });
  };

  const td: CSSProperties = { padding: '12px 18px', borderBottom: '1px solid var(--border)' };

  const tabs: { k: Tab; label: string; count: number }[] = [
    { k: 'active', label: isAr ? 'النشطة' : 'Active', count: activeCases.length },
    { k: 'closed', label: t('status_closed'), count: closedCases.length },
    { k: 'all', label: t('filter_all'), count: activeCases.length + closedCases.length },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>{t('nav_cases')}</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            {isAr ? 'سجل جميع الحالات' : 'All case records'}
          </p>
        </div>
        <Button icon={<IconPlus size={16} />} onClick={() => navigate('/create-case')}>
          {t('new_case')}
        </Button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: 4,
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          marginBottom: 14,
          width: 'fit-content',
        }}
      >
        {tabs.map((x) => (
          <button
            key={x.k}
            onClick={() => setTab(x.k)}
            style={{
              height: 32,
              padding: '0 14px',
              borderRadius: 6,
              border: `1px solid ${tab === x.k ? 'var(--border-strong)' : 'transparent'}`,
              background: tab === x.k ? 'var(--panel-2)' : 'transparent',
              color: tab === x.k ? 'var(--ink)' : 'var(--muted)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {x.label}
            <span
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                background: tab === x.k ? 'var(--panel)' : 'transparent',
                padding: '1px 6px',
                borderRadius: 999,
                border: '1px solid var(--border)',
              }}
            >
              {num(x.count)}
            </span>
          </button>
        ))}
      </div>

      <Card padded={false}>
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {(
            [
              { k: 'all' as Filter, label: t('filter_all') },
              { k: 'CRITICAL' as Filter, label: t('filter_critical') },
              { k: 'HIGH' as Filter, label: t('filter_serious') },
              { k: 'MODERATE' as Filter, label: t('filter_moderate') },
              { k: 'LOW' as Filter, label: t('filter_low') },
            ]
          ).map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              style={{
                height: 30,
                padding: '0 12px',
                borderRadius: 999,
                border: `1px solid ${filter === f.k ? 'var(--accent)' : 'var(--border-strong)'}`,
                background: filter === f.k ? 'var(--accent-soft)' : 'var(--panel)',
                color: filter === f.k ? 'var(--accent-ink)' : 'var(--ink-2)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {f.label}
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
                  onClick={() => navigate(`/cases/${c.id}`)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = 'var(--panel-2)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')}
                >
                  <td style={td}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 600 }}>{c.id.slice(0, 8)}</span>
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
                        <Avatar name={c.assignedTo.name} size={24} />
                        <span>{c.assignedTo.name}</span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>—</span>
                    )}
                  </td>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{c.ambulanceEta ?? '—'}</td>
                  <td style={{ ...td, color: 'var(--muted)', fontSize: 12 }}>{openedAgo(c)}</td>
                  <td style={td}>
                    <IconChevron size={14} style={{ color: 'var(--muted)', transform: isAr ? 'scaleX(-1)' : 'none' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: 'var(--muted)',
          }}
        >
          <span>
            {num(filtered.length)} {isAr ? 'نتيجة' : 'results'}
          </span>
        </div>
      </Card>
    </div>
  );
}
