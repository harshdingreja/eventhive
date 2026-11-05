const express = require('express');
const cors = require('cors');
const config = require('./config');
const requestLogger = require('./middleware/requestLogger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Builds the Express app without starting it. server.js starts it on a port;
// the tests start it on a random free port. Keeping them apart makes testing easy.
function createApp() {
  const app = express();

  // Middleware runs in the order it is added, for every request.
  app.use(cors({ origin: config.clientOrigins })); // which websites may call this API (Exp 12)
  app.use(express.json({ limit: '100kb' })); // turns a JSON request body into req.body
  if (!config.isTest) app.use(requestLogger);

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/events', require('./routes/events'));
  app.use('/api/registrations', require('./routes/registrations'));
  app.use('/api/checkin', require('./routes/checkin'));
  app.use('/api/entry-logs', require('./routes/entryLogs'));
  app.use('/api/stats', require('./routes/stats'));

  // These two must come last: they handle whatever the routes above did not.
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
