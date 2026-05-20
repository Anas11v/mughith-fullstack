import type { CaseStatus, SeverityLevel } from '../types';

export const SEVERITY_HEX: Record<SeverityLevel, string> = {
  CRITICAL: '#ff2d3d',
  HIGH: '#ff9d2e',
  MODERATE: '#fde047',
  LOW: '#10b981',
};

export const STATUS_HEX: Record<CaseStatus, string> = {
  OPEN: '#ff2d3d',
  ASSIGNED: '#ff9d2e',
  ON_SCENE: '#38bdf8',
  CLOSED: '#10b981',
  EXPIRED: '#71717a',
};

export const SEVERITY_TW: Record<SeverityLevel, string> = {
  CRITICAL: 'bg-[#ff2d3d1a] text-[#ff5566] ring-[#ff2d3d33]',
  HIGH: 'bg-[#ff9d2e1a] text-[#ffb763] ring-[#ff9d2e33]',
  MODERATE: 'bg-[#fde0471a] text-[#fde047] ring-[#fde04733]',
  LOW: 'bg-[#10b9811a] text-[#34d399] ring-[#10b98133]',
};

export const STATUS_TW: Record<CaseStatus, string> = {
  OPEN: 'bg-[#ff2d3d1a] text-[#ff5566] ring-[#ff2d3d33]',
  ASSIGNED: 'bg-[#ff9d2e1a] text-[#ffb763] ring-[#ff9d2e33]',
  ON_SCENE: 'bg-[#38bdf81a] text-[#7dd3fc] ring-[#38bdf833]',
  CLOSED: 'bg-[#10b9811a] text-[#34d399] ring-[#10b98133]',
  EXPIRED: 'bg-[#71717a1a] text-[#a1a1aa] ring-[#71717a33]',
};

export const DONATOR_STATE_HEX = {
  AVAILABLE: '#10b981',
  BUSY: '#ff9d2e',
  OFFLINE: '#52525b',
} as const;

export const STATUS_LABEL: Record<CaseStatus, string> = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  ON_SCENE: 'On Scene',
  CLOSED: 'Closed',
  EXPIRED: 'Expired',
};

export const SEVERITY_LABEL: Record<SeverityLevel, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MODERATE: 'Moderate',
  LOW: 'Low',
};
