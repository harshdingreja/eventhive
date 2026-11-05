const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Experiment 8: callbacks and the event loop.
//
// Routes "announce" what happened with activity.emit('registered', ...). Listeners
// decide what to do with it (here: append a line to logs/activity.log). The route
// never waits for the disk, so a slow write can't slow down a student's registration.
const activity = new EventEmitter();
const logFile = path.join(config.logDir, 'activity.log');

fs.mkdir(config.logDir, { recursive: true }, (err) => {
  if (err) console.error('Could not create log folder:', err.message);
});

function writeLine(line) {
  // fs.appendFile is non-blocking: Node hands the write to its background thread pool
  // and returns immediately. When the write finishes, the event loop runs this callback.
  fs.appendFile(logFile, `${new Date().toISOString()} ${line}\n`, (err) => {
    if (err) console.error('Activity log write failed:', err.message);
  });
}

activity.on('registered', ({ user, event, registration }) => {
  writeLine(`REGISTERED ${registration.registrationId} ${user.email} -> "${event.title}"`);
});

activity.on('checked_in', ({ registrationId, studentEmail, eventTitle, adminName }) => {
  writeLine(`CHECKED_IN ${registrationId} ${studentEmail} at "${eventTitle}" by ${adminName}`);
});

activity.on('event_saved', ({ action, event, adminName }) => {
  writeLine(`EVENT_${action.toUpperCase()} "${event.title}" by ${adminName}`);
});

activity.on('reminder', ({ event, minutesLeft, notCheckedIn }) => {
  writeLine(`REMINDER "${event.title}" starts in ${minutesLeft} min, ${notCheckedIn} registered students`);
});

// Reads the newest `limit` lines, callback style: callback(error, lines).
// A missing file just means nothing has happened yet, so it is not an error.
function readRecentLines(limit, callback) {
  fs.readFile(logFile, 'utf8', (err, data) => {
    if (err && err.code === 'ENOENT') return callback(null, []);
    if (err) return callback(err);
    const lines = data.trim().split('\n').filter(Boolean);
    return callback(null, lines.slice(-limit).reverse());
  });
}

module.exports = { activity, readRecentLines };
