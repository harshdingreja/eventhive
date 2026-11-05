import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { homeFor } from '../components/RouteGuards.jsx';

export default function NotFoundPage() {
  const { user } = useAuth();
  return (
    <EmptyState
      icon="search"
      title="This page does not exist"
      action={<Link to={homeFor(user)} className="btn btn--primary">Go to {user.role === 'admin' ? 'dashboard' : 'events'}</Link>}
    >
      The link may be old or mistyped.
    </EmptyState>
  );
}
