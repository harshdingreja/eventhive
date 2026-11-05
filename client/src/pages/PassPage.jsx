import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import PassTicket from '../components/PassTicket.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Alert from '../components/Alert.jsx';
import Icon from '../components/Icon.jsx';

export default function PassPage() {
  const { registrationId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const { data, error, loading } = useApi(() => api.get(`/registrations/${registrationId}`), [registrationId]);

  const isAdmin = user.role === 'admin';
  const backTo = isAdmin && data ? `/admin/events/${data.pass.event.id}` : '/passes';
  const backLabel = isAdmin ? 'Back to participants' : 'All my passes';

  if (loading && !data) return <Spinner label="Loading pass" />;
  if (error) {
    return (
      <EmptyState
        icon="ticket"
        title={error.status === 403 ? 'This pass belongs to someone else' : 'Pass not found'}
        action={
          <Link to={isAdmin ? '/admin' : '/passes'} className="btn">
            {isAdmin ? 'Back to dashboard' : 'Go to my passes'}
          </Link>
        }
      >
        Check the link, or open the pass from your list of passes.
      </EmptyState>
    );
  }

  return (
    <div className="pass-page">
      <Link to={backTo} className="back-link">
        <Icon name="back" />
        {backLabel}
      </Link>

      {location.state?.justRegistered && (
        <Alert tone="success" title="You're registered">
          This is your pass. Show the QR code at the entrance, from your phone or printed.
        </Alert>
      )}

      <PassTicket pass={data.pass} />

      <div className="pass-page__actions">
        <button type="button" className="btn" onClick={() => window.print()}>
          <Icon name="print" />
          Print pass
        </button>
        <p className="muted">
          The QR code holds only your registration ID, never your name or email.
        </p>
      </div>
    </div>
  );
}
