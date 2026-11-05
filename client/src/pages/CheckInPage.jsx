import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { formatDate, formatDateTime, formatTime, todayString } from '../lib/format.js';

// The QR library is large, and only admins at the gate need it, so it is downloaded
// only when the camera is first switched on (code splitting with React.lazy).
const QrScanner = lazy(() => import('../components/QrScanner.jsx'));
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Alert from '../components/Alert.jsx';
import Icon from '../components/Icon.jsx';

const RESULT_LABELS = {
  success: 'Let in',
  already_checked_in: 'Already used',
  wrong_event: 'Wrong event',
  not_found: 'Unknown ID',
  error: 'Not checked',
};
const RESULT_TONES = { success: 'success', already_checked_in: 'amber', wrong_event: 'danger', not_found: 'danger', error: 'danger' };

// Default gate: today's earliest event, otherwise the next upcoming one, otherwise the first.
function pickDefaultEvent(events) {
  const today = todayString();
  return events.find((e) => e.date === today) ?? events.find((e) => e.date > today) ?? events[0];
}

function ScanResult({ outcome }) {
  const tone = RESULT_TONES[outcome.result];
  const { pass } = outcome;
  return (
    <div className={`scan-result scan-result--${tone}`} role="status" aria-live="assertive">
      <Icon name={outcome.ok ? 'check' : 'x'} size={30} className="scan-result__icon" />
      <div>
        <p className="scan-result__title">{outcome.message}</p>
        {pass && (
          <p className="scan-result__who">
            <strong>{pass.student.name}</strong> <span className="code">{pass.registrationId}</span>
          </p>
        )}
        {outcome.result === 'already_checked_in' && pass && <p>Checked in at {formatDateTime(pass.checkedInAt)}</p>}
        {outcome.result === 'wrong_event' && pass && <p>This pass is for {pass.event.title}</p>}
        {outcome.ok && <p>Compare the name with the student&apos;s college ID card.</p>}
      </div>
    </div>
  );
}

// One gate-log entry, with an inline note editor (MongoDB update).
function LogItem({ log, onSaveNote, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(log.note);

  async function save(e) {
    e.preventDefault();
    await onSaveNote(log, note.trim());
    setEditing(false);
  }

  return (
    <li className="log-item">
      <span className={`badge badge--${RESULT_TONES[log.result]}`}>{RESULT_LABELS[log.result]}</span>
      <div className="log-item__main">
        <p>
          <strong>{log.student?.name ?? 'No matching pass'}</strong> <span className="code">{log.registrationId}</span>
        </p>
        <p className="muted">
          {formatDateTime(log.createdAt)}, {log.method === 'camera' ? 'scanned' : 'typed'} by {log.scannedBy?.name ?? 'admin'}
          {log.registeredFor && `. Pass is for ${log.registeredFor.title}`}
        </p>
        {editing ? (
          <form className="log-item__note-form" onSubmit={save}>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. Verified ID card manually" autoFocus />
            <button type="submit" className="btn btn--small btn--primary">Save note</button>
            <button type="button" className="btn btn--small btn--ghost" onClick={() => { setNote(log.note); setEditing(false); }}>Cancel</button>
          </form>
        ) : (
          log.note && <p className="log-item__note"><Icon name="note" size={15} />{log.note}</p>
        )}
      </div>
      {!editing && (
        <div className="log-item__actions">
          <button type="button" className="btn btn--small btn--ghost" onClick={() => setEditing(true)}>
            {log.note ? 'Edit note' : 'Add note'}
          </button>
          <button type="button" className="btn btn--small btn--icon btn--ghost" onClick={() => onDelete(log)} title="Delete entry">
            <Icon name="trash" size={16} />
            <span className="sr-only">Delete entry</span>
          </button>
        </div>
      )}
    </li>
  );
}

export default function CheckInPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const eventsQuery = useApi(() => api.get('/events'), []);
  const events = useMemo(() => eventsQuery.data?.events ?? [], [eventsQuery.data]);

  const selected = events.find((e) => e.id === Number(searchParams.get('event'))) ?? pickDefaultEvent(events);
  const selectedId = selected?.id;

  const [resultFilter, setResultFilter] = useState('');
  const logsQuery = useApi(
    () => (selectedId ? api.get(`/entry-logs?eventId=${selectedId}&limit=40${resultFilter ? `&result=${resultFilter}` : ''}`) : Promise.resolve({ logs: [] })),
    [selectedId, resultFilter],
  );

  const [manualId, setManualId] = useState('');
  const [outcome, setOutcome] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [logError, setLogError] = useState('');
  const busyRef = useRef(false); // a ref, so the camera callback sees the latest value instantly
  const inputRef = useRef(null);

  const { reload: reloadEvents } = eventsQuery;
  const { reload: reloadLogs } = logsQuery;

  const submitScan = useCallback(
    async (rawId, method) => {
      if (busyRef.current || !selectedId) return;
      busyRef.current = true;
      setBusy(true);
      try {
        const result = await api.post('/checkin', { registrationId: rawId, eventId: selectedId, method });
        setOutcome({ ...result, at: Date.now() });
        if (method === 'manual') setManualId('');
        reloadEvents();
        reloadLogs();
      } catch (err) {
        setOutcome({ ok: false, result: 'error', message: err.message, pass: null, at: Date.now() });
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [selectedId, reloadEvents, reloadLogs],
  );

  const handleCameraScan = useCallback((text) => submitScan(text, 'camera'), [submitScan]);

  // Several volunteers can run gates for the same event; refresh counts and the log
  // every 5 seconds so each screen also shows the others' scans.
  useEffect(() => {
    const timer = setInterval(() => {
      reloadEvents();
      reloadLogs();
    }, 5000);
    return () => clearInterval(timer);
  }, [reloadEvents, reloadLogs]);

  // Keyboard shortcut (Experiment 4a, addEventListener): "/" jumps to the ID box.
  useEffect(() => {
    function handleKeyDown(e) {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function saveNote(log, note) {
    try {
      await api.patch(`/entry-logs/${log._id}`, { note });
      reloadLogs();
    } catch (err) {
      setLogError(err.message);
    }
  }

  async function deleteLog(log) {
    if (!window.confirm('Delete this log entry?')) return;
    try {
      await api.delete(`/entry-logs/${log._id}`);
      reloadLogs();
    } catch (err) {
      setLogError(err.message);
    }
  }

  async function clearLog() {
    if (!window.confirm(`Clear the whole gate log for "${selected.title}"? Check-ins themselves are kept.`)) return;
    try {
      await api.delete(`/entry-logs?eventId=${selectedId}`);
      reloadLogs();
    } catch (err) {
      setLogError(err.message);
    }
  }

  if (eventsQuery.loading && !eventsQuery.data) return <Spinner label="Loading events" />;
  if (events.length === 0) {
    return (
      <EmptyState icon="camera" title="No events to check in" action={<Link to="/admin/events/new" className="btn btn--primary">Create an event</Link>}>
        Create an event first, then open its gate here.
      </EmptyState>
    );
  }

  const logs = logsQuery.data?.logs ?? [];
  const remaining = selected.registeredCount - selected.checkedInCount;

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Gate check-in</h1>
          <p className="page-sub">Scan a pass or type its ID. Each pass works once.</p>
        </div>
      </header>

      <div className="gate">
        <section className="panel gate__controls">
          <label className="field">
            <span className="field__label">Event at this gate</span>
            <select
              value={selectedId}
              onChange={(e) => {
                setSearchParams({ event: e.target.value });
                setOutcome(null);
              }}
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({formatDate(e.date)})
                </option>
              ))}
            </select>
          </label>

          <div className="gate__count" aria-live="polite">
            <span className="gate__count-number">{selected.checkedInCount}</span>
            <span>
              of {selected.registeredCount} checked in
              <small>{remaining} still to arrive. Starts {formatTime(selected.startTime)}</small>
            </span>
          </div>

          <div className="gate__camera">
            {cameraOn ? (
              <>
                <Suspense fallback={<Spinner label="Starting camera" />}>
                  <QrScanner onScan={handleCameraScan} />
                </Suspense>
                <button type="button" className="btn btn--block" onClick={() => setCameraOn(false)}>Stop camera</button>
              </>
            ) : (
              <button type="button" className="btn btn--primary btn--block btn--tall" onClick={() => setCameraOn(true)}>
                <Icon name="camera" size={22} />
                Scan with camera
              </button>
            )}
          </div>

          <form
            className="gate__manual"
            onSubmit={(e) => {
              e.preventDefault();
              if (manualId.trim()) submitScan(manualId, 'manual');
            }}
          >
            <label className="field__label" htmlFor="manual-id">
              Or type the registration ID <kbd>/</kbd>
            </label>
            <div className="gate__manual-row">
              <input
                id="manual-id"
                ref={inputRef}
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="EH-XXXX-XXXX"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck="false"
                className="code-input"
              />
              <button type="submit" className="btn btn--amber" disabled={busy || !manualId.trim()}>
                {busy ? 'Checking…' : 'Check in'}
              </button>
            </div>
          </form>
        </section>

        <section className="gate__result">
          {outcome ? (
            <ScanResult key={outcome.at} outcome={outcome} />
          ) : (
            <div className="scan-result scan-result--idle">
              <Icon name="ticket" size={30} className="scan-result__icon" />
              <div>
                <p className="scan-result__title">Ready for the next pass</p>
                <p>The result of each scan appears here.</p>
              </div>
            </div>
          )}

          <div className="section-head">
            <h2 className="section-title">Gate log</h2>
            <div className="section-head__tools">
              <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} aria-label="Filter log">
                <option value="">All scans</option>
                <option value="success">Let in</option>
                <option value="already_checked_in">Already used</option>
                <option value="wrong_event">Wrong event</option>
                <option value="not_found">Unknown ID</option>
              </select>
              {logs.length > 0 && (
                <button type="button" className="btn btn--small btn--ghost" onClick={clearLog}>Clear log</button>
              )}
            </div>
          </div>
          <p className="muted section-lead">Every attempt is stored in MongoDB, including rejected ones.</p>

          {logError && <Alert tone="error" onClose={() => setLogError('')}>{logError}</Alert>}
          {logsQuery.error && <Alert tone="error">{logsQuery.error.message}</Alert>}

          {logs.length === 0 ? (
            <p className="muted">No scans {resultFilter ? 'of this kind ' : ''}for this event yet.</p>
          ) : (
            <ul className="log-list">
              {logs.map((log) => (
                <LogItem key={log._id} log={log} onSaveNote={saveNote} onDelete={deleteLog} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
