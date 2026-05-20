export const minutesBetween = (a: Date | string, b: Date | string = new Date()): number => {
  const ad = typeof a === 'string' ? new Date(a) : a;
  const bd = typeof b === 'string' ? new Date(b) : b;
  return Math.floor((bd.getTime() - ad.getTime()) / 60000);
};

export const formatAgo = (
  iso: string,
  t: (k: string) => string,
  tpl: (k: string, vars?: Record<string, string | number>) => string,
  num: (n: number | string) => string,
): string => {
  const mins = minutesBetween(iso);
  if (mins < 1) return t('just_now');
  if (mins < 60) return tpl('minutes_ago', { m: num(mins) });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return tpl('hours_ago', { h: num(hrs) });
  const days = Math.floor(hrs / 24);
  return tpl('days_ago', { d: num(days) });
};

export const formatResponseTime = (ms: number): string => {
  const mins = ms / 1000 / 60;
  if (mins <= 0) return '—';
  const mm = Math.floor(mins);
  const ss = Math.round((mins - mm) * 60);
  return `${mm}:${String(ss).padStart(2, '0')}`;
};
