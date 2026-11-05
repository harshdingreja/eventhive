// "2026-11-06" for the given moment in the server's local time zone.
// (toISOString() would use UTC and give yesterday's date before 5:30 AM in India.)
function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// The moment an event starts, from its DATEONLY + TIME columns.
function eventStart(event) {
  return new Date(`${event.date}T${String(event.startTime).slice(0, 5)}:00`);
}

module.exports = { localDateString, addDays, eventStart };
