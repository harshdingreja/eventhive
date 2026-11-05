import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import SeatsMeter from './SeatsMeter.jsx';
import { dateParts, formatTime, relativeDay } from '../lib/format.js';

// One event in the student's list. Everything it shows comes in through props
// (Experiment 6), so the same card works anywhere an event object is available.
export default function EventCard({ event, onRegister, registering }) {
  const { day, month, weekday } = dateParts(event.date);
  const isFull = event.seatsLeft === 0;

  let action;
  if (event.myRegistrationId) {
    action = (
      <Link to={`/passes/${event.myRegistrationId}`} className="btn btn--amber">
        <Icon name="ticket" />
        View my pass
      </Link>
    );
  } else if (event.hasStarted) {
    action = <button type="button" className="btn" disabled>Registration closed</button>;
  } else if (isFull) {
    action = <button type="button" className="btn" disabled>Event full</button>;
  } else {
    action = (
      <button type="button" className="btn btn--primary" onClick={() => onRegister(event)} disabled={registering}>
        {registering ? 'Registering…' : 'Register'}
      </button>
    );
  }

  return (
    <article className="event-card">
      <div className="event-card__date">
        <span className="event-card__month">{month}</span>
        <span className="event-card__day">{day}</span>
        <span className="event-card__weekday">{weekday}</span>
      </div>

      <div className="event-card__body">
        <div className="event-card__top">
          <span className="tag" data-category={event.category}>{event.category}</span>
          {event.myRegistrationId && <span className="badge badge--success">Registered</span>}
        </div>
        <h3 className="event-card__title">{event.title}</h3>
        <p className="event-card__desc">{event.description}</p>

        <ul className="meta">
          <li>
            <Icon name="clock" />
            {relativeDay(event.date)}, {formatTime(event.startTime)}
          </li>
          <li>
            <Icon name="pin" />
            {event.venue}
          </li>
          <li>
            <Icon name="users" />
            {event.organizer}
          </li>
        </ul>

        <SeatsMeter capacity={event.capacity} registered={event.registeredCount} />
        <div className="event-card__action">{action}</div>
      </div>
    </article>
  );
}
