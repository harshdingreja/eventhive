const AppError = require('../utils/AppError');

// Runs when no route matched the URL.
function notFound(req, res, next) {
  next(new AppError(404, `No route for ${req.method} ${req.originalUrl}`));
}

// Express recognises error middleware by its four arguments. Every thrown error,
// including ones from async handlers (Express 5 catches those for us), ends up here,
// so the browser always receives the same JSON shape: { error, details? }.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ error: 'That record already exists' });
  }
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({ error: err.errors.map((e) => e.message).join(', ') });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ error: err.message }); // Mongoose validation
  }

  // Anything else is a bug: log the details on the server, but don't leak them to users.
  console.error(err);
  return res.status(500).json({ error: 'Something went wrong on the server' });
}

module.exports = { notFound, errorHandler };
