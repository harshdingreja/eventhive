const { DataTypes } = require('sequelize');
const sequelize = require('../db/postgres');

const CATEGORIES = ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Social'];

const Event = sequelize.define('Event', {
  title: { type: DataTypes.STRING(120), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  category: { type: DataTypes.ENUM(...CATEGORIES), allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false }, // "2026-11-06"
  startTime: { type: DataTypes.TIME, allowNull: false }, // "10:30:00"
  venue: { type: DataTypes.STRING(120), allowNull: false },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 },
  },
  // The club running the event, shown on the card (e.g. "CSI VESIT").
  // organizerId (the admin account that created it) is added in models/index.js.
  organizer: { type: DataTypes.STRING(80), allowNull: false },
});

Event.CATEGORIES = CATEGORIES;

module.exports = Event;
