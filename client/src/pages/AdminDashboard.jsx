import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { formatDate, formatDateTime, todayString } from '../lib/format.js';
import StatTile from '../components/StatTile.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Alert from '../components/Alert.jsx';
import Icon from '../components/Icon.jsx';

const ACTIVITY_LABELS = {
  REGISTERED: 'Registration',
  CHECKED_IN: 'Check-in',
  EVENT_CREATED: 'Event created',
  EVENT_UPDATED: 'Event edited',
  EVENT_DELETED: 'Event deleted',
  REMINDER: 'Reminder',
};

// "2026-11-05T09:12:03.120Z REGISTERED EH-… a@b -> "Title"" -> { at, kind, text }
function parseActivity(line) {
  const [at, kind, ...rest] = line.split(' ');
  return { at, kind, text: rest.join(' ') };
}

export default function AdminDashboard() {
  const location = useLocation();
  const [flash, setFlash] = useState(location.state?.flash ?? '');
  const [actionError, setActionError] = useState('');
  const { data, error, loading, reload } = useApi(
    () => Promise.all([api.get('/stats'), api.get('/stats/activity')]).then(([stats, activity]) => ({ ...stats, activity: activity.lines })),
    [],
  );

  async function handleDelete(event) {
    const ok = window.confirm(`Delete "${event.title}"? Its ${event.registered} registrations will be deleted too.`);
    if (!ok) return;
    try {
      await api.delete(`/events/${event.id}`);
      setFlash(`Deleted "${event.title}"`);
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  }

  if (loading && !data) return <Spinner label="Loading dashboard" />;
  if (error && !data) {
    return (
      <Alert tone="error" title="Could not load the dashboard">
        {error.message} <button type="button" className="link-button" onClick={reload}>Try again</button>
      </Alert>
    );
  }

  const { totals, perEvent, activity } = data;
  const today = todayString();
  const fill = totals.capacity ? Math.round((totals.registrations / totals.capacity) * 100) : 0;
  const turnout = totals.registrations ? Math.round((totals.checkIns / totals.registrations) * 100) : 0;

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Every COG event, its registrations and who has arrived.</p>
        </div>
        <div className="page-head__actions">
          <Link to="/admin/checkin" className="btn">
            <Icon name="camera" />
            Gate check-in
          </Link>
          <Link to="/admin/events/new" className="btn btn--primary">
            <Icon name="plus" />
            Create event
          </Link>
        </div>
      </header>

      {flash && <Alert tone="success" onClose={() => setFlash('')}>{flash}</Alert>}
      {actionError && <Alert tone="error" onClose={() => setActionError('')}>{actionError}</Alert>}

      <div className="stats">
        <StatTile label="Events" value={totals.events} detail={`${totals.students} students signed up`} />
        <StatTile label="Registrations" value={totals.registrations} detail={`${fill}% of ${totals.capacity} seats`} tone="purple" />
        <StatTile label="Checked in" value={totals.checkIns} detail={`${turnout}% of registered students`} tone="green" />
        <StatTile
          label="Rejected scans"
          value={totals.rejectedScans ?? 'n/a'}
          detail={totals.rejectedScans === null ? 'MongoDB is unreachable' : 'Used, unknown or wrong-event passes'}
          tone="amber"
        />
      </div>

      <section className="section">
        <h2 className="section-title">Events</h2>
        {perEvent.length === 0 ? (
          <EmptyState
            title="No events yet"
            action={<Link to="/admin/events/new" className="btn btn--primary">Create the first event</Link>}
          >
            Students will see events here as soon as you publish them.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Registered</th>
                  <th scope="col">Checked in</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {perEvent.map((event) => (
                  <tr key={event.id} className={event.date < today ? 'is-past' : undefined}>
                    <td data-label="Event">
                      <Link to={`/admin/events/${event.id}`} className="table__title">{event.title}</Link>
                      <span className="table__sub">
                        {formatDate(event.date)}
                        {event.date < today && ' (finished)'}
                      </span>
                    </td>
                    <td data-label="Registered">
                      <div className="mini-meter">
                        <span className="mini-meter__bar">
                          <span style={{ width: `${Math.min(event.fillPercent, 100)}%` }} />
                        </span>
                        {event.registered} / {event.capacity}
                      </div>
                    </td>
                    <td data-label="Checked in">{event.checkedIn}</td>
                    <td className="table__actions">
                      <Link to={`/admin/events/${event.id}`} className="btn btn--small">Participants</Link>
                      <Link to={`/admin/events/${event.id}/edit`} className="btn btn--small btn--icon" title="Edit event">
                        <Icon name="edit" size={16} />
                        <span className="sr-only">Edit {event.title}</span>
                      </Link>
                      <button type="button" className="btn btn--small btn--icon btn--danger" title="Delete event" onClick={() => handleDelete(event)}>
                        <Icon name="trash" size={16} />
                        <span className="sr-only">Delete {event.title}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">Recent server activity</h2>
        <p className="muted section-lead">
          Written to logs/activity.log by a Node EventEmitter listener and read back with a callback.
        </p>
        {activity.length === 0 ? (
          <p className="muted">Nothing logged yet. Registrations and check-ins will appear here.</p>
        ) : (
          <ul className="activity">
            {activity.map((line) => {
              const entry = parseActivity(line);
              return (
                <li key={line}>
                  <time dateTime={entry.at}>{formatDateTime(entry.at)}</time>
                  <span className="activity__kind" data-kind={entry.kind}>{ACTIVITY_LABELS[entry.kind] ?? entry.kind}</span>
                  <span className="activity__text">{entry.text}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
