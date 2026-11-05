// Experiment 4b: client-side validation. Runs before anything is sent, so students get
// instant feedback. The server repeats the same checks (server/src/utils/validators.js),
// because a request can also come from outside this app.

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const CATEGORIES = ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Social'];

export const hasErrors = (errors) => Object.keys(errors).length > 0;

export function validateLogin({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Enter your email';
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'This does not look like an email address';
  if (!password) errors.password = 'Enter your password';
  return errors;
}

export function validateSignup({ name, email, password, confirmPassword }) {
  const errors = {};
  const trimmedName = name.trim();

  if (!trimmedName) errors.name = 'Enter your name';
  else if (trimmedName.length < 2) errors.name = 'Name must be at least 2 characters';

  if (!email.trim()) errors.email = 'Enter your email';
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'This does not look like an email address';

  if (password.length < 8) errors.password = 'Use at least 8 characters';
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) errors.password = 'Include at least one letter and one number';

  if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match';
  return errors;
}

export function validateEvent(form, { isNew, today }) {
  const errors = {};
  const capacity = Number(form.capacity);

  if (form.title.trim().length < 3) errors.title = 'Title must be at least 3 characters';
  if (form.description.trim().length < 10) errors.description = 'Describe the event in at least 10 characters';
  if (!CATEGORIES.includes(form.category)) errors.category = 'Pick a category';
  if (!form.date) errors.date = 'Pick a date';
  else if (isNew && form.date < today) errors.date = 'Date cannot be in the past';
  if (!form.startTime) errors.startTime = 'Pick a start time';
  if (!form.venue.trim()) errors.venue = 'Enter the venue';
  if (!form.organizer.trim()) errors.organizer = 'Enter the organizing club';
  if (form.capacity === '' || Number.isNaN(capacity)) errors.capacity = 'Enter the number of seats';
  else if (!Number.isInteger(capacity) || capacity < 1 || capacity > 5000) {
    errors.capacity = 'Use a whole number from 1 to 5000';
  }
  return errors;
}
