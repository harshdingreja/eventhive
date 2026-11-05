import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { DEFAULT_FILTERS, countByCategory, filterEvents } from '../lib/filters.js';
import { firstName, formatTime, plural, relativeDay } from '../lib/format.js';
import EventCard from '../components/EventCard.jsx';
import EventFilters from '../components/EventFilters.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Alert from '../components/Alert.jsx';
import Icon from '../components/Icon.jsx';

export default function EventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi(() => api.get('/events'), []);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [registeringId, setRegisteringId] = useState(null);
  const [notice, setNotice] = useState(null);

  // useMemo: only recompute when the events or the filters actually change.
  const events = useMemo(() => data?.events ?? [], [data]);
  const visible = useMemo(() => filterEvents(events, filters), [events, filters]);
  const counts = useMemo(() => countByCategory(events), [events]);
  const nextUp = events.find((e) => e.myRegistrationId && !e.hasStarted);

  async function handleRegister(event) {
    setRegisteringId(event.id);
    setNotice(null);
    try {
      const { pass } = await api.post(`/events/${event.id}/register`);
      navigate(`/passes/${pass.registrationId}`, { state: { justRegistered: true } });
    } catch (err) {
      setNotice(`${event.title}: ${err.message}`);
      reload(); // seat counts may have changed since the page loaded
    } finally {
      setRegisteringId(null);
    }
  }

  if (loading && !data) return <Spinner label="Loading events" />;

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Hi {firstName(user.name)}, here is what&apos;s on</h1>
          <p className="page-sub">
            {plural(events.length, 'upcoming event')} from COG clubs. Registering gives you a pass straight away.
          </p>
        </div>
      </header>

      {nextUp && (
        <Link to={`/passes/${nextUp.myRegistrationId}`} className="next-up">
          <Icon name="ticket" size={24} />
          <span className="next-up__text">
            <strong>Your next event: {nextUp.title}</strong>
            <span>
              {relativeDay(nextUp.date)} at {formatTime(nextUp.startTime)}, {nextUp.venue}
            </span>
          </span>
          <span className="next-up__cta">Open pass</span>
        </Link>
      )}

      {error && (
        <Alert tone="error" title="Could not load events">
          {error.message} <button type="button" className="link-button" onClick={reload}>Try again</button>
        </Alert>
      )}
      {notice && (
        <Alert tone="error" onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      {events.length === 0 && !error ? (
        <EmptyState title="No upcoming events yet">
          COG clubs have not published anything for the coming days. Check back soon.
        </EmptyState>
      ) : (
        <>
          <EventFilters filters={filters} onChange={setFilters} counts={counts} total={events.length} />
          <p className="results-count" aria-live="polite">
            Showing {visible.length} of {plural(events.length, 'event')}
          </p>

          {visible.length === 0 ? (
            <EmptyState
              icon="search"
              title="No events match these filters"
              action={
                <button type="button" className="btn" onClick={() => setFilters(DEFAULT_FILTERS)}>
                  Clear filters
                </button>
              }
            >
              Try another category or a wider date range.
            </EmptyState>
          ) : (
            <div className="event-grid">
              {/* key tells React which card is which when the filtered list changes */}
              {visible.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onRegister={handleRegister}
                  registering={registeringId === event.id}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
