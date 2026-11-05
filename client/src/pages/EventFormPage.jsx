import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { CATEGORIES, hasErrors, validateEvent } from '../lib/validators.js';
import { todayString } from '../lib/format.js';
import Field from '../components/Field.jsx';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import Icon from '../components/Icon.jsx';

const EMPTY = {
  title: '',
  description: '',
  category: 'Technical',
  date: '',
  startTime: '',
  venue: '',
  organizer: '',
  capacity: '',
};

// One page for both "create" (/admin/events/new) and "edit" (/admin/events/:id/edit).
export default function EventFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const today = todayString();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loadingEvent, setLoadingEvent] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/events/${id}`)
      .then(({ event }) => {
        // Copy only the editable fields into the form; inputs want strings.
        const fields = Object.keys(EMPTY).reduce((acc, key) => ({ ...acc, [key]: String(event[key] ?? '') }), {});
        setForm(fields);
      })
      .catch((err) => setServerError(err.message))
      .finally(() => setLoadingEvent(false));
  }, [id, isEdit]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (errors[name]) {
      const { [name]: _fixed, ...rest } = errors;
      setErrors(rest);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validateEvent(form, { isNew: !isEdit, today });
    setErrors(found);
    if (hasErrors(found)) return;

    setSubmitting(true);
    setServerError('');
    const body = { ...form, capacity: Number(form.capacity) };
    try {
      const { event } = isEdit ? await api.put(`/events/${id}`, body) : await api.post('/events', body);
      navigate(`/admin/events/${event.id}`, { state: { flash: isEdit ? 'Changes saved' : 'Event published' } });
    } catch (err) {
      setServerError(err.message);
      if (err.details) setErrors(err.details); // the server's per-field messages
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingEvent) return <Spinner label="Loading event" />;

  return (
    <div className="narrow">
      <Link to={isEdit ? `/admin/events/${id}` : '/admin'} className="back-link">
        <Icon name="back" />
        {isEdit ? 'Back to event' : 'Back to dashboard'}
      </Link>

      <header className="page-head">
        <div>
          <h1 className="page-title">{isEdit ? 'Edit event' : 'Create an event'}</h1>
          <p className="page-sub">
            {isEdit ? 'Students see changes as soon as you save.' : 'Students can register as soon as you publish it.'}
          </p>
        </div>
      </header>

      {serverError && <Alert tone="error">{serverError}</Alert>}

      <form className="form panel" onSubmit={handleSubmit} noValidate>
        <Field label="Event name" error={errors.title} required>
          <input name="title" value={form.title} onChange={handleChange} maxLength={120} placeholder="e.g. CodeSprint 24-Hour Hackathon" />
        </Field>

        <Field label="Description" hint={`${form.description.length} / 2000 characters`} error={errors.description} required>
          <textarea name="description" rows={4} value={form.description} onChange={handleChange} maxLength={2000} />
        </Field>

        <div className="form__grid">
          <Field label="Category" error={errors.category} required>
            <select name="category" value={form.category} onChange={handleChange}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Organizing club" error={errors.organizer} required>
            <input name="organizer" value={form.organizer} onChange={handleChange} maxLength={80} placeholder="e.g. CSI VESIT" />
          </Field>
          <Field label="Date" error={errors.date} required>
            <input name="date" type="date" value={form.date} onChange={handleChange} min={isEdit ? undefined : today} />
          </Field>
          <Field label="Start time" error={errors.startTime} required>
            <input name="startTime" type="time" value={form.startTime} onChange={handleChange} />
          </Field>
          <Field label="Venue" error={errors.venue} required>
            <input name="venue" value={form.venue} onChange={handleChange} maxLength={120} placeholder="e.g. Seminar Hall, 4th Floor" />
          </Field>
          <Field label="Seats" hint="Registration closes when these run out" error={errors.capacity} required>
            <input name="capacity" type="number" inputMode="numeric" min={1} max={5000} step={1} value={form.capacity} onChange={handleChange} />
          </Field>
        </div>

        <div className="form__actions">
          <Link to={isEdit ? `/admin/events/${id}` : '/admin'} className="btn btn--ghost">Cancel</Link>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Publish event'}
          </button>
        </div>
      </form>
    </div>
  );
}
