// Custom middleware (Experiment 9): prints one line per request, e.g.
//   POST /api/events/3/register 201 12.4ms
// It runs before the route, but logs only when the response has finished,
// because that is the first moment the status code and duration are known.
function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`);
  });
  next();
}

module.exports = requestLogger;
