// Experiment 3: string helpers. Dates arrive from the API as "2026-11-08" and times as
// "14:00"; these turn them into what people read: "Sun, 8 Nov 2026" and "2:00 PM".

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MS = 24 * 60 * 60 * 1000;

const pad2 = (n) => String(n).padStart(2, '0');

// new Date("2026-11-08") would be read as UTC midnight; split it so it stays a local date.
export function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function todayString(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function formatDate(dateString) {
  const d = parseLocalDate(dateString);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function dateParts(dateString) {
  const d = parseLocalDate(dateString);
  return { day: pad2(d.getDate()), month: MONTHS[d.getMonth()], weekday: WEEKDAYS[d.getDay()] };
}

export function formatTime(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${hours % 12 || 12}:${pad2(minutes)} ${suffix}`;
}

// For timestamps such as checkedInAt: "8 Nov, 9:42 AM".
export function formatDateTime(isoString) {
  const d = new Date(isoString);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${formatTime(`${d.getHours()}:${d.getMinutes()}`)}`;
}

export function daysUntil(dateString, from = new Date()) {
  const start = parseLocalDate(todayString(from));
  return Math.round((parseLocalDate(dateString) - start) / DAY_MS);
}

export function relativeDay(dateString) {
  const days = daysUntil(dateString);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  return days > 0 ? `In ${days} days` : `${-days} days ago`;
}

export function firstName(fullName) {
  return fullName.trim().split(/\s+/)[0];
}

export function initials(fullName) {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

export function plural(count, word, pluralWord = `${word}s`) {
  return `${count} ${count === 1 ? word : pluralWord}`;
}
