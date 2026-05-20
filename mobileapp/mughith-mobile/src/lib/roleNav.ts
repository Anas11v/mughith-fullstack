import type { UserRole } from '../types';

export type RoleNavRoot = 'DispatcherTabs' | 'AdminTabs' | 'VolunteerTabs';

export const rootForRole = (role: UserRole): RoleNavRoot => {
  switch (role) {
    case 'DISPATCHER':
      return 'DispatcherTabs';
    case 'ADMIN':
      return 'AdminTabs';
    case 'DONATOR':
    case 'AMBULANCE_CREW':
    default:
      return 'VolunteerTabs';
  }
};
