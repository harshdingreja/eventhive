const config = require('./config');
const { sequelize } = require('./models');
const { connectMongo } = require('./db/mongo');
const createApp = require('./app');
const { startReminderJob } = require('./jobs/reminderJob');

async function start() {
  // Connect to both databases before accepting requests, so the first request
  // can't fail just because a database wasn't ready yet.
  await sequelize.authenticate();
  await sequelize.sync(); // creates missing tables from the models (never drops data)
  console.log('PostgreSQL connected');

  await connectMongo(config.mongoUrl);
  console.log('MongoDB connected');

  const app = createApp();
  app.listen(config.port, (err) => {
    if (err) {
      console.error(`Could not listen on port ${config.port}:`, err.message);
      process.exit(1);
    }
    console.log(`EventHive API running on http://localhost:${config.port}`);
  });

  startReminderJob();
}

start().catch((err) => {
  console.error('EventHive API failed to start:', err.message);
  process.exit(1);
});
