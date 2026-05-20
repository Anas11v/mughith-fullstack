import { useI18n } from '../lib/i18n';
import { Badge, Card } from '../components/common/primitives';

interface Center {
  name: string;
  ops: number;
  cases: number;
  avg: string;
  status: 'online' | 'degraded';
  region: string;
}

export default function AdminCenters() {
  const { isAr, num } = useI18n();

  const centers: Center[] = [
    { name: 'DC-01 Riyadh', ops: 18, cases: 142, avg: '3:12', status: 'online', region: isAr ? 'الرياض' : 'Riyadh' },
    { name: 'DC-02 Jeddah', ops: 12, cases: 98, avg: '3:34', status: 'online', region: isAr ? 'جدّة' : 'Jeddah' },
    { name: 'DC-03 Makkah', ops: 9, cases: 58, avg: '2:58', status: 'online', region: isAr ? 'مكّة' : 'Makkah' },
    { name: 'DC-04 Dammam', ops: 7, cases: 41, avg: '4:21', status: 'degraded', region: isAr ? 'الدمّام' : 'Dammam' },
    { name: 'DC-05 Madinah', ops: 6, cases: 33, avg: '3:05', status: 'online', region: isAr ? 'المدينة' : 'Madinah' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
          {isAr ? 'مراكز الإرسال' : 'Dispatch centers'}
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
          {isAr
            ? 'حالة كل مركز إرسال (عرض تجريبي — لا يدعمها الباك‑إند حاليًا)'
            : 'Status of each dispatch center — placeholder; not yet tracked by backend'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {centers.map((c) => (
          <Card key={c.name}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  background: c.status === 'online' ? '#22c55e' : '#f59e0b',
                  boxShadow: `0 0 0 3px ${
                    c.status === 'online' ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'
                  }`,
                }}
              />
              <div style={{ flex: 1, fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{c.name}</div>
              <Badge tone={c.status === 'online' ? 'accent' : 'serious'}>
                {c.status === 'online' ? (isAr ? 'متّصل' : 'Online') : isAr ? 'متأخّر' : 'Degraded'}
              </Badge>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{c.region}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <Mini label={isAr ? 'مشغّلون' : 'Operators'} value={num(c.ops)} />
              <Mini label={isAr ? 'حالات' : 'Cases'} value={num(c.cases)} />
              <Mini label={isAr ? 'متوسّط' : 'Avg resp.'} value={c.avg} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10.5,
          color: 'var(--muted)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}
