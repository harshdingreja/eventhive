import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppShell from './components/AppShell.jsx';
import { GuestOnly, RequireAuth, RequireRole, homeFor } from './components/RouteGuards.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import EventsPage from './pages/EventsPage.jsx';
import MyPassesPage from './pages/MyPassesPage.jsx';
import PassPage from './pages/PassPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import EventFormPage from './pages/EventFormPage.jsx';
import EventDetailPage from './pages/EventDetailPage.jsx';
import CheckInPage from './pages/CheckInPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={homeFor(user)} replace />;
}

const student = (page) => <RequireRole role="student">{page}</RequireRole>;
const admin = (page) => <RequireRole role="admin">{page}</RequireRole>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/signup" element={<GuestOnly><SignupPage /></GuestOnly>} />

      {/* Everything below needs a logged-in user and shares the navbar layout. */}
      <Route element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/events" element={student(<EventsPage />)} />
        <Route path="/passes" element={student(<MyPassesPage />)} />
        <Route path="/passes/:registrationId" element={<PassPage />} />
        <Route path="/admin" element={admin(<AdminDashboard />)} />
        <Route path="/admin/events/new" element={admin(<EventFormPage />)} />
        <Route path="/admin/events/:id" element={admin(<EventDetailPage />)} />
        <Route path="/admin/events/:id/edit" element={admin(<EventFormPage />)} />
        <Route path="/admin/checkin" element={admin(<CheckInPage />)} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
