export const colors = {
  bg: '#0b1220',
  bgElev: '#111a2e',
  card: '#15203a',
  border: '#27324d',
  text: '#e7ecf5',
  textDim: '#9aa6c0',
  primary: '#3b82f6',
  primaryDark: '#1e40af',
  primarySoft: '#3b82f622',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  critical: '#dc2626',
  high: '#f97316',
  moderate: '#eab308',
  low: '#22c55e',
};

export const severityColor = (s: string): string => {
  switch (s) {
    case 'CRITICAL':
      return colors.critical;
    case 'HIGH':
      return colors.high;
    case 'MODERATE':
      return colors.moderate;
    case 'LOW':
      return colors.low;
    default:
      return colors.textDim;
  }
};

export const statusColor = (s: string): string => {
  switch (s) {
    case 'OPEN':
      return colors.warning;
    case 'ASSIGNED':
      return colors.primary;
    case 'ON_SCENE':
      return colors.success;
    case 'CLOSED':
      return colors.textDim;
    case 'EXPIRED':
      return colors.danger;
    default:
      return colors.textDim;
  }
};

export const presenceColor = (p: string): string => {
  switch (p) {
    case 'AVAILABLE':
      return colors.success;
    case 'BUSY':
      return colors.warning;
    case 'OFFLINE':
      return colors.textDim;
    default:
      return colors.textDim;
  }
};
