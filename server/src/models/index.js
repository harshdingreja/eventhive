const sequelize = require('../db/postgres');
const User = require('./User');
const Event = require('./Event');
const Registration = require('./Registration');

// Relationships (these become foreign keys in PostgreSQL):
//   an admin User organizes many Events
//   a User has many Registrations, an Event has many Registrations
// onDelete CASCADE: deleting an event automatically deletes its registrations.
const organizerKey = { name: 'organizerId', allowNull: false };
User.hasMany(Event, { foreignKey: organizerKey, as: 'organizedEvents' });
Event.belongsTo(User, { foreignKey: organizerKey, as: 'organizerAccount' });

const userKey = { name: 'userId', allowNull: false };
User.hasMany(Registration, { foreignKey: userKey, onDelete: 'CASCADE' });
Registration.belongsTo(User, { foreignKey: userKey });

const eventKey = { name: 'eventId', allowNull: false };
Event.hasMany(Registration, { foreignKey: eventKey, onDelete: 'CASCADE' });
Registration.belongsTo(Event, { foreignKey: eventKey });

module.exports = { sequelize, User, Event, Registration };
