import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { splitPasses } from '../lib/filters.js';
import { dateParts, formatTime, relativeDay } from '../lib/format.js';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Alert from '../components/Alert.jsx';

function PassRow({ pass }) {
  const { day, month } = dateParts(pass.event.date);
  const checkedIn = pass.status === 'checked_in';
  return (
    <li>
      <Link to={`/passes/${pass.registrationId}`} className="pass-row">
        <span className="pass-row__date">
          <span>{month}</span>
          <strong>{day}</strong>
        </span>
        <span className="pass-row__main">
          <strong>{pass.event.title}</strong>
          <span>
            {relativeDay(pass.event.date)}, {formatTime(pass.event.startTime)} at {pass.event.venue}
          </span>
        </span>
        <span className="pass-row__code">{pass.registrationId}</span>
        <span className={`badge ${checkedIn ? 'badge--success' : 'badge--amber'}`}>
          {checkedIn ? 'Checked in' : 'Not used yet'}
        </span>
      </Link>
    </li>
  );
}

export default function MyPassesPage() {
  const { data, error, loading, reload } = useApi(() => api.get('/registrations/me'), []);

  if (loading && !data) return <Spinner label="Loading your passes" />;
  if (error && !data) {
    return (
      <Alert tone="error" title="Could not load your passes">
        {error.message} <button type="button" className="link-button" onClick={reload}>Try again</button>
      </Alert>
    );
  }

  const { upcoming, past } = splitPasses(data.passes);

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">My passes</h1>
          <p className="page-sub">Open a pass to show its QR code at the entrance.</p>
        </div>
      </header>

      {data.passes.length === 0 ? (
        <EmptyState
          icon="ticket"
          title="You have no passes yet"
          action={
            <Link to="/events" className="btn btn--primary">
              Browse events
            </Link>
          }
        >
          Register for an event and its pass will appear here.
        </EmptyState>
      ) : (
        <>
          <section className="section">
            <h2 className="section-title">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="muted">No upcoming events. Your past passes are below.</p>
            ) : (
              <ul className="pass-list">
                {upcoming.map((pass) => (
                  <PassRow key={pass.registrationId} pass={pass} />
                ))}
              </ul>
            )}
          </section>

          {past.length > 0 && (
            <section className="section">
              <h2 className="section-title">Past events</h2>
              <ul className="pass-list pass-list--past">
                {past.map((pass) => (
                  <PassRow key={pass.registrationId} pass={pass} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
