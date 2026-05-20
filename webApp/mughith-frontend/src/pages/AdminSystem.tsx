import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { Badge, Card, StatCard } from '../components/common/primitives';

interface ServiceStatus {
  name: string;
  status: 'ok' | 'warn';
  latency: string;
}

export default function AdminSystem() {
  const { isAr, num } = useI18n();
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const ping = async () => {
      const start = performance.now();
      try {
        await api.get('/health');
        setHealthy(true);
        setLatency(Math.round(performance.now() - start));
      } catch {
        setHealthy(false);
        setLatency(null);
      }
    };
    ping();
    const i = setInterval(ping, 15000);
    return () => clearInterval(i);
  }, []);

  const services: ServiceStatus[] = [
    { name: 'API gateway', status: healthy === false ? 'warn' : 'ok', latency: latency != null ? `${latency}ms` : '—' },
    { name: 'Dispatch engine', status: 'ok', latency: '41ms' },
    { name: 'Notification service', status: 'ok', latency: '112ms' },
    { name: 'Mapping tiles', status: 'ok', latency: '18ms' },
    { name: 'Database primary', status: 'ok', latency: '6ms' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
          {isAr ? 'صحّة النظام' : 'System health'}
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
          {isAr ? 'حالة الخدمات والبنية التحتية' : 'Services and infrastructure status'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        <StatCard label={isAr ? 'حالة API' : 'API status'} value={healthy === null ? '…' : healthy ? 'OK' : 'DOWN'} accent={!!healthy} />
        <StatCard
          label={isAr ? 'زمن الاستجابة' : 'API latency'}
          value={latency != null ? `${latency}ms` : '—'}
          sub={isAr ? 'حيّ' : 'live'}
        />
        <StatCard label={isAr ? 'هدف وقت التشغيل' : 'Uptime target'} value="99.95%" />
        <StatCard label={isAr ? 'الخدمات' : 'Services'} value={num(services.length)} />
      </div>

      <Card padded={false}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}>
          {isAr ? 'الخدمات' : 'Services'}
        </div>
        {services.map((s, i) => (
          <div
            key={s.name}
            style={{
              padding: '12px 18px',
              borderBottom: i === services.length - 1 ? 'none' : '1px solid var(--border)',
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
                background: s.status === 'ok' ? '#22c55e' : '#f59e0b',
                boxShadow: `0 0 0 3px ${
                  s.status === 'ok' ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'
                }`,
              }}
            />
            <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{s.name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{s.latency}</div>
            <Badge tone={s.status === 'ok' ? 'accent' : 'serious'}>
              {s.status === 'ok' ? (isAr ? 'سليم' : 'Healthy') : isAr ? 'تحذير' : 'Warning'}
            </Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}
