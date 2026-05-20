import type { EmergencyCase } from '../types';

const escape = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export const casesToCsv = (cases: EmergencyCase[]): string => {
  const headers = [
    'Case ID',
    'Address',
    'Latitude',
    'Longitude',
    'Severity',
    'Status',
    'Created At',
    'Closed At',
    'Assigned To',
    'Outcome',
    'Notes',
  ];

  const rows = cases.map((c) =>
    [
      c.id,
      c.address,
      c.latitude,
      c.longitude,
      c.severity,
      c.status,
      c.createdAt,
      c.closedAt ?? '',
      c.assignedTo?.name ?? '',
      c.outcome ?? '',
      c.notes ?? '',
    ]
      .map(escape)
      .join(','),
  );

  return [headers.join(','), ...rows].join('\n');
};

export const downloadBlob = (filename: string, content: string, mime = 'text/csv'): void => {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
