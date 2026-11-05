const { Sequelize } = require('sequelize');
const config = require('../config');

// One Sequelize instance = one pool of connections to PostgreSQL, shared by every model.
// Hosted databases (Neon, Supabase) require SSL, which they signal with sslmode=require.
const needsSsl = config.databaseUrl.includes('sslmode=require');

const sequelize = new Sequelize(config.databaseUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: needsSsl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
});

module.exports = sequelize;
