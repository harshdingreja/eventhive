const path = require('path');

// All settings come from environment variables, so passwords and secrets never
// have to be written inside the code. The fallbacks make local development work
// with zero setup on a machine that has PostgreSQL and MongoDB running.
const config = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL || 'postgres://localhost:5432/eventhive',
  mongoUrl: process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/eventhive',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-production',
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
  logDir: process.env.LOG_DIR || path.join(__dirname, '..', 'logs'),
  isTest: process.env.NODE_ENV === 'test',
};

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

module.exports = config;
