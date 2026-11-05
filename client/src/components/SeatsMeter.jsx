// A bar showing how full an event is, with the number that matters most to a student.
export default function SeatsMeter({ capacity, registered }) {
  const seatsLeft = Math.max(capacity - registered, 0);
  const percent = Math.min(Math.round((registered / capacity) * 100), 100);
  const level = seatsLeft === 0 ? 'full' : seatsLeft <= Math.max(3, capacity * 0.1) ? 'low' : 'ok';

  let text = `${seatsLeft} of ${capacity} seats left`;
  if (level === 'full') text = `Full, all ${capacity} seats taken`;
  else if (level === 'low') text = `Only ${seatsLeft} ${seatsLeft === 1 ? 'seat' : 'seats'} left`;

  return (
    <div className={`meter meter--${level}`}>
      <div
        className="meter__track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={registered}
        aria-label="Seats taken"
      >
        <span className="meter__fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="meter__text">{text}</span>
    </div>
  );
}
