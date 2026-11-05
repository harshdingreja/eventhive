const AppError = require('./AppError');
const Event = require('../models/Event');
const { localDateString } = require('./dates');

// Server-side validation (Experiment 4b). The React app checks the same rules for
// instant feedback, but anyone can call the API directly with curl or Postman,
// so the server must never trust what the browser sends.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const text = (value) => (typeof value === 'string' ? value.trim() : '');

function failIfErrors(errors) {
  if (Object.keys(errors).length > 0) {
    throw new AppError(400, 'Please fix the highlighted fields', errors);
  }
}

function validateSignup(body) {
  const name = text(body.name);
  const email = text(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const errors = {};

  if (name.length < 2 || name.length > 80) errors.name = 'Name must be 2 to 80 characters';
  if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address';
  if (password.length < 8) errors.password = 'Password must be at least 8 characters';
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = 'Password must contain a letter and a number';
  }

  failIfErrors(errors);
  return { name, email, password };
}

function validateLogin(body) {
  const email = text(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const errors = {};
  if (!email) errors.email = 'Email is required';
  if (!password) errors.password = 'Password is required';
  failIfErrors(errors);
  return { email, password };
}

function isRealDate(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && localDateString(parsed) === value;
}

// isNew: brand-new events cannot be placed in the past; edits of old events are allowed.
function validateEvent(body, { isNew }) {
  const value = {
    title: text(body.title),
    description: text(body.description),
    category: text(body.category),
    date: text(body.date),
    startTime: text(body.startTime).slice(0, 5),
    venue: text(body.venue),
    organizer: text(body.organizer),
    capacity: Number(body.capacity),
  };
  const errors = {};

  if (value.title.length < 3 || value.title.length > 120) errors.title = 'Title must be 3 to 120 characters';
  if (value.description.length < 10 || value.description.length > 2000) {
    errors.description = 'Description must be 10 to 2000 characters';
  }
  if (!Event.CATEGORIES.includes(value.category)) errors.category = 'Pick a category';
  if (!isRealDate(value.date)) errors.date = 'Enter a valid date';
  else if (isNew && value.date < localDateString()) errors.date = 'Date cannot be in the past';
  if (!TIME_PATTERN.test(value.startTime)) errors.startTime = 'Enter a valid start time';
  if (value.venue.length < 2 || value.venue.length > 120) errors.venue = 'Venue is required';
  if (value.organizer.length < 2 || value.organizer.length > 80) errors.organizer = 'Organizer is required';
  if (!Number.isInteger(value.capacity) || value.capacity < 1 || value.capacity > 5000) {
    errors.capacity = 'Capacity must be a whole number from 1 to 5000';
  }

  failIfErrors(errors);
  return value;
}

// Route params arrive as strings; reject "abc" or "1.5" before they reach PostgreSQL.
function parseId(raw, label = 'id') {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new AppError(400, `Invalid ${label}`);
  return id;
}

module.exports = { validateSignup, validateLogin, validateEvent, parseId };
