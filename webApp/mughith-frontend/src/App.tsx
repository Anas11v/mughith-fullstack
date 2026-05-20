import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppLayout from './components/Layout/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Forbidden from './pages/Forbidden';
import NotFound from './pages/NotFound';
import Dashboard from './pages/Dashboard';
import CreateCase from './pages/CreateCase';
import CaseList from './pages/CaseList';
import CaseDetail from './pages/CaseDetail';
import Volunteers from './pages/Volunteers';
import Reports from './pages/Reports';
import AdminHome from './pages/AdminHome';
import AdminApprovals from './pages/AdminApprovals';
import AdminCenters from './pages/AdminCenters';
import AdminUsers from './pages/AdminUsers';
import AdminSystem from './pages/AdminSystem';
import DonaterHome from './pages/DonaterHome';
import VolunteerAlert from './pages/VolunteerAlert';
import VolunteerNavigate from './pages/VolunteerNavigate';
import VolunteerOnScene from './pages/VolunteerOnScene';
import VolunteerHistory from './pages/VolunteerHistory';
import VolunteerProfile from './pages/VolunteerProfile';
import { useStore } from './store/useStore';
import { homeForRole } from './lib/roleNav';

function RootRedirect() {
  const user = useStore((s) => s.user);
  const accessToken = useStore((s) => s.accessToken);
  if (!user || !accessToken) return <Navigate to="/login" replace />;
  return <Navigate to={homeForRole(user.role)} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: 'var(--radius-sm)',
            background: 'var(--panel)',
            color: 'var(--ink)',
            border: '1px solid var(--border)',
            fontFamily: 'var(--font)',
            fontSize: 13,
            boxShadow: 'var(--shadow-md)',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forbidden" element={<Forbidden />} />
        <Route element={<AppLayout />}>
          {/* Operator (DISPATCHER) */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-case" element={<CreateCase />} />
          <Route path="/cases" element={<CaseList />} />
          <Route path="/cases/:id" element={<CaseDetail />} />
          <Route path="/volunteers" element={<Volunteers />} />
          <Route path="/reports" element={<Reports />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/admin/approvals" element={<AdminApprovals />} />
          <Route path="/admin/centers" element={<AdminCenters />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/system" element={<AdminSystem />} />

          {/* Volunteer (DONATOR) */}
          <Route path="/vol" element={<Outlet />}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<DonaterHome />} />
            <Route path="alert" element={<VolunteerAlert />} />
            <Route path="navigate" element={<VolunteerNavigate />} />
            <Route path="onscene" element={<VolunteerOnScene />} />
            <Route path="history" element={<VolunteerHistory />} />
            <Route path="profile" element={<VolunteerProfile />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
