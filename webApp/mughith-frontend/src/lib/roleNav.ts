import type { UserRole } from '../types';

export interface NavKey {
  to: string;
  labelKey: string;
  iconKey: NavIcon;
  roles: UserRole[];
}

export type NavIcon =
  | 'dashboard'
  | 'plus'
  | 'cases'
  | 'volunteers'
  | 'reports'
  | 'shield'
  | 'layers'
  | 'alert'
  | 'target'
  | 'heart'
  | 'user'
  | 'settings'
  | 'help';

// Dispatcher = operator
const operatorNav: NavKey[] = [
  { to: '/dashboard', labelKey: 'nav_dashboard', iconKey: 'dashboard', roles: ['DISPATCHER'] },
  { to: '/create-case', labelKey: 'nav_new_case', iconKey: 'plus', roles: ['DISPATCHER', 'ADMIN'] },
  { to: '/cases', labelKey: 'nav_cases', iconKey: 'cases', roles: ['DISPATCHER', 'ADMIN'] },
  { to: '/volunteers', labelKey: 'nav_volunteers', iconKey: 'volunteers', roles: ['DISPATCHER', 'ADMIN'] },
  { to: '/reports', labelKey: 'nav_reports', iconKey: 'reports', roles: ['DISPATCHER', 'ADMIN'] },
];

const adminNav: NavKey[] = [
  { to: '/admin', labelKey: 'nav_dashboard', iconKey: 'dashboard', roles: ['ADMIN'] },
  { to: '/create-case', labelKey: 'nav_new_case', iconKey: 'plus', roles: ['ADMIN'] },
  { to: '/cases', labelKey: 'nav_cases', iconKey: 'cases', roles: ['ADMIN'] },
  { to: '/admin/approvals', labelKey: 'pending_approvals', iconKey: 'shield', roles: ['ADMIN'] },
  { to: '/admin/centers', labelKey: 'dispatch_centers', iconKey: 'layers', roles: ['ADMIN'] },
  { to: '/admin/users', labelKey: 'nav_volunteers', iconKey: 'volunteers', roles: ['ADMIN'] },
  { to: '/admin/system', labelKey: 'nav_reports', iconKey: 'reports', roles: ['ADMIN'] },
];

const volunteerNav: NavKey[] = [
  { to: '/vol/home', labelKey: 'nav_dashboard', iconKey: 'dashboard', roles: ['DONATOR', 'AMBULANCE_CREW'] },
  { to: '/vol/alert', labelKey: 'incoming_alert', iconKey: 'alert', roles: ['DONATOR', 'AMBULANCE_CREW'] },
  { to: '/vol/navigate', labelKey: 'status_enroute', iconKey: 'target', roles: ['DONATOR', 'AMBULANCE_CREW'] },
  { to: '/vol/onscene', labelKey: 'status_onscene', iconKey: 'heart', roles: ['DONATOR', 'AMBULANCE_CREW'] },
  { to: '/vol/history', labelKey: 'case_history', iconKey: 'cases', roles: ['DONATOR', 'AMBULANCE_CREW'] },
  { to: '/vol/profile', labelKey: 'profile', iconKey: 'user', roles: ['DONATOR', 'AMBULANCE_CREW'] },
];

export const navForRole = (role: UserRole | undefined): NavKey[] => {
  if (!role) return [];
  if (role === 'ADMIN') return adminNav;
  if (role === 'DONATOR' || role === 'AMBULANCE_CREW') return volunteerNav;
  if (role === 'DISPATCHER') return operatorNav;
  return operatorNav.filter((n) => n.roles.includes(role));
};

export const homeForRole = (role: UserRole): string => {
  switch (role) {
    case 'DISPATCHER':
      return '/dashboard';
    case 'AMBULANCE_CREW':
      return '/vol/home';
    case 'ADMIN':
      return '/admin';
    case 'DONATOR':
      return '/vol/home';
  }
};

export const canAccessRoute = (role: UserRole | undefined, path: string): boolean => {
  if (!role) return false;
  if (path.startsWith('/admin')) return role === 'ADMIN';
  if (path.startsWith('/vol')) return role === 'DONATOR' || role === 'AMBULANCE_CREW';
  if (/^\/cases\/[^/]+$/.test(path)) return ['DISPATCHER', 'ADMIN'].includes(role);
  if (path === '/dashboard' || path === '/cases' || path === '/create-case' || path === '/volunteers' || path === '/reports') {
    return ['DISPATCHER', 'ADMIN'].includes(role);
  }
  return true;
};
