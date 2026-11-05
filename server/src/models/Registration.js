const { DataTypes } = require('sequelize');
const sequelize = require('../db/postgres');

// One row = one student's seat at one event. userId and eventId are added in models/index.js.
const Registration = sequelize.define(
  'Registration',
  {
    // The short code printed on the pass and inside its QR code, e.g. "EH-7K3F-9Q2A".
    // It is random, so it reveals nothing about the student; the QR holds only this.
    registrationId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM('registered', 'checked_in'),
      allowNull: false,
      defaultValue: 'registered',
    },
    checkedInAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    // Backstop for duplicate registrations: even if application code had a bug,
    // PostgreSQL would reject a second row for the same student + event.
    indexes: [{ unique: true, fields: ['userId', 'eventId'] }],
  },
);

module.exports = Registration;
