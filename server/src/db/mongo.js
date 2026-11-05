const mongoose = require('mongoose');

// Mongoose keeps one shared connection for the whole app; models use it automatically.
// The short timeout makes a stopped MongoDB fail fast with a clear error instead of hanging.
async function connectMongo(url) {
  await mongoose.connect(url, { serverSelectionTimeoutMS: 5000 });
}

async function disconnectMongo() {
  await mongoose.disconnect();
}

module.exports = { connectMongo, disconnectMongo };
