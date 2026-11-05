// An error we throw on purpose, carrying the HTTP status to send back.
// The error-handling middleware turns it into a JSON response, so route code can
// simply `throw new AppError(404, 'Event not found')` instead of building responses.
class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details; // optional, e.g. { title: 'Title is required' } for form fields
  }
}

module.exports = AppError;
