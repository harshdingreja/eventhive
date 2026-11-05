import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { useDebounced } from '../hooks/useDebounced.js';
import { api } from '../lib/api.js';
import { formatDate, formatDateTime, formatTime, plural } from '../lib/format.js';
import StatTile from '../components/StatTile.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Alert from '../components/Alert.jsx';
import Icon from '../components/Icon.jsx';

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search.trim(), 300);
  const [notice, setNotice] = useState(location.state?.flash ? { tone: 'success', text: location.state.flash } : null);
  const [checkingId, setCheckingId] = useState(null);

  const eventQuery = useApi(() => api.get(`/events/${id}`), [id]);
  const participantsQuery = useApi(
    () => api.get(`/events/${id}/participants?search=${encodeURIComponent(debouncedSearch)}`),
    [id, debouncedSearch],
  );

  async function handleCheckIn(participant) {
    setCheckingId(participant.registrationId);
    try {
      const outcome = await api.post('/checkin', {
        registrationId: participant.registrationId,
        eventId: Number(id),
        method: 'manual',
      });
      setNotice({ tone: outcome.ok ? 'success' : 'warning', text: `${participant.student.name}: ${outcome.message}` });
      participantsQuery.reload();
      eventQuery.reload();
    } catch (err) {
      setNotice({ tone: 'error', text: err.message });
    } finally {
      setCheckingId(null);
    }
  }

  async function handleDelete() {
    const event = eventQuery.data.event;
    const ok = window.confirm(`Delete "${event.title}"? Its ${event.registeredCount} registrations will be deleted too.`);
    if (!ok) return;
    try {
      await api.delete(`/events/${id}`);
      navigate('/admin', { state: { flash: `Deleted "${event.title}"` } });
    } catch (err) {
      setNotice({ tone: 'error', text: err.message });
    }
  }

  if (eventQuery.loading && !eventQuery.data) return <Spinner label="Loading event" />;
  if (eventQuery.error) {
    return (
      <EmptyState title="Event not found" action={<Link to="/admin" className="btn">Back to dashboard</Link>}>
        It may have been deleted.
      </EmptyState>
    );
  }

  const { event } = eventQuery.data;
  const participants = participantsQuery.data?.participants ?? [];
  const notArrived = event.registeredCount - event.checkedInCount;

  return (
    <>
      <Link to="/admin" className="back-link">
        <Icon name="back" />
        Dashboard
      </Link>

      <header className="page-head">
        <div>
          <span className="tag" data-category={event.category}>{event.category}</span>
          <h1 className="page-title">{event.title}</h1>
          <ul className="meta meta--inline">
            <li><Icon name="calendar" />{formatDate(event.date)}, {formatTime(event.startTime)}</li>
            <li><Icon name="pin" />{event.venue}</li>
            <li><Icon name="users" />{event.organizer}</li>
          </ul>
        </div>
        <div className="page-head__actions">
          <Link to={`/admin/checkin?event=${event.id}`} className="btn btn--primary">
            <Icon name="camera" />
            Open gate check-in
          </Link>
          <Link to={`/admin/events/${event.id}/edit`} className="btn">
            <Icon name="edit" />
            Edit
          </Link>
          <button type="button" className="btn btn--danger" onClick={handleDelete}>
            <Icon name="trash" />
            Delete
          </button>
        </div>
      </header>

      {notice && <Alert tone={notice.tone} onClose={() => setNotice(null)}>{notice.text}</Alert>}

      <div className="stats">
        <StatTile label="Registered" value={event.registeredCount} detail={`of ${event.capacity} seats`} tone="purple" />
        <StatTile label="Checked in" value={event.checkedInCount} detail={`${notArrived} not arrived yet`} tone="green" />
        <StatTile label="Seats left" value={event.seatsLeft} detail={event.seatsLeft === 0 ? 'Registration is closed' : 'Still open'} tone="amber" />
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Participants</h2>
          <label className="search search--compact">
            <Icon name="search" />
            <span className="sr-only">Search participants</span>
            <input
              type="search"
              placeholder="Name, email or registration ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        {participantsQuery.error && <Alert tone="error">{participantsQuery.error.message}</Alert>}

        {participantsQuery.loading && !participantsQuery.data ? (
          <Spinner label="Loading participants" />
        ) : participants.length === 0 ? (
          <EmptyState icon="users" title={debouncedSearch ? 'Nobody matches that search' : 'No registrations yet'}>
            {debouncedSearch ? 'Check the spelling, or search by registration ID.' : 'Students who register will appear here.'}
          </EmptyState>
        ) : (
          <>
            <p className="results-count">{plural(participants.length, 'participant')}{debouncedSearch && ` matching "${debouncedSearch}"`}</p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Registration ID</th>
                    <th scope="col">Status</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => (
                    <tr key={p.registrationId}>
                      <td data-label="Student">
                        <span className="table__title">{p.student.name}</span>
                        <span className="table__sub">{p.student.email}</span>
                      </td>
                      <td data-label="Registration ID"><span className="code">{p.registrationId}</span></td>
                      <td data-label="Status">
                        {p.status === 'checked_in' ? (
                          <span className="badge badge--success">Checked in {formatDateTime(p.checkedInAt)}</span>
                        ) : (
                          <span className="badge badge--amber">Not arrived</span>
                        )}
                      </td>
                      <td className="table__actions">
                        {p.status !== 'checked_in' && (
                          <button
                            type="button"
                            className="btn btn--small"
                            onClick={() => handleCheckIn(p)}
                            disabled={checkingId === p.registrationId}
                          >
                            <Icon name="check" size={16} />
                            Check in
                          </button>
                        )}
                        <Link to={`/passes/${p.registrationId}`} className="btn btn--small btn--ghost">View pass</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </>
  );
}
