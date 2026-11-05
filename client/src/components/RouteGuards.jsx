/* eslint-disable react-refresh/only-export-components */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from './Spinner.jsx';

// Where each role lands after logging in.
export const homeFor = (user) => (user.role === 'admin' ? '/admin' : '/events');

function CheckingSession() {
  return (
    <div className="center-screen">
      <Spinner label="Opening EventHive" />
    </div>
  );
}

// Only logged-in users; everyone else goes to /login and comes back afterwards.
export function RequireAuth({ children }) {
  const { user, checking } = useAuth();
  const location = useLocation();
  if (checking) return <CheckingSession />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

// Only one role. The server enforces this too; this just avoids showing a page
// whose every request would be refused.
export function RequireRole({ role, children }) {
  const { user } = useAuth();
  if (user.role !== role) return <Navigate to={homeFor(user)} replace />;
  return children;
}

// Login and signup pages: a logged-in user has no reason to see them.
export function GuestOnly({ children }) {
  const { user, checking } = useAuth();
  if (checking) return <CheckingSession />;
  if (user) return <Navigate to={homeFor(user)} replace />;
  return children;
}
