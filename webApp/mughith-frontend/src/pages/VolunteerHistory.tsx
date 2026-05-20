import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiErrorMessage } from '../lib/api';
import { getCaseHistory } from '../lib/cases';
import { useI18n } from '../lib/i18n';
import { Badge, Card, SeverityChip } from '../components/common/primitives';
import type { EmergencyCase } from '../types';
import { formatDistanceToNow } from 'date-fns';

export default function VolunteerHistory() {
  const { t, isAr } = useI18n();
  const [items, setItems] = useState<EmergencyCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await getCaseHistory();
        setItems(r);
      } catch (err) {
        toast.error(apiErrorMessage(err, t('error_generic')));
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{t('case_history')}</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
          {isAr ? 'الحالات التي شاركت فيها' : 'Cases you responded to'}
        </p>
      </div>

      {items.length === 0 && !loading ? (
        <Card>
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>{t('no_data')}</div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((x) => (
            <Card key={x.id} style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{x.id.slice(0, 8)}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                  {formatDistanceToNow(new Date(x.createdAt), { addSuffix: true })}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>{x.address}</div>
              <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                <SeverityChip level={x.severity} />
                <Badge tone={x.outcome ? 'accent' : 'neutral'}>
                  {x.outcome ? (isAr ? 'تم التسليم' : 'Handed off') : x.status}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
