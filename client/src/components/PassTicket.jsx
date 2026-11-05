import { QRCodeSVG } from 'qrcode.react';
import { LogoMark } from './Logo.jsx';
import { formatDate, formatDateTime, formatTime } from '../lib/format.js';

// The digital pass. The QR code encodes ONLY the registration ID: no name, email or
// anything else personal. The gate scanner sends that ID to the server, which looks
// up everything else, so a screenshot of the QR reveals nothing about the student.
export default function PassTicket({ pass }) {
  const { event, student } = pass;
  const checkedIn = pass.status === 'checked_in';

  return (
    <div className={`ticket${checkedIn ? ' ticket--used' : ''}`}>
      <section className="ticket__main">
        <div className="ticket__brand">
          <LogoMark size={22} />
          <span>EventHive pass</span>
          <span className="ticket__category">{event.category}</span>
        </div>

        <h2 className="ticket__title">{event.title}</h2>

        <dl className="ticket__details">
          <div>
            <dt>Date</dt>
            <dd>{formatDate(event.date)}</dd>
          </div>
          <div>
            <dt>Starts</dt>
            <dd>{formatTime(event.startTime)}</dd>
          </div>
          <div>
            <dt>Venue</dt>
            <dd>{event.venue}</dd>
          </div>
          <div>
            <dt>Organizer</dt>
            <dd>{event.organizer}</dd>
          </div>
          {student && (
            <div className="ticket__attendee">
              <dt>Attendee</dt>
              <dd>{student.name}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="ticket__stub" aria-label="Entry code">
        <div className="ticket__qr">
          <QRCodeSVG value={pass.registrationId} size={168} level="M" marginSize={1} fgColor="#0A1128" bgColor="#FFFFFF" />
        </div>
        <p className="ticket__id">{pass.registrationId}</p>
        <p className="ticket__hint">
          {checkedIn ? `Checked in ${formatDateTime(pass.checkedInAt)}` : 'Show this code at the entrance'}
        </p>
      </section>

      {checkedIn && (
        <div className="ticket__stamp" aria-hidden="true">
          Checked in
        </div>
      )}
    </div>
  );
}
