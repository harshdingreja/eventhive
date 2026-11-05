const { fn, col } = require('sequelize');
const { Registration } = require('../models');
const { eventStart } = require('../utils/dates');

// One GROUP BY query for all events instead of one COUNT query per event:
//   SELECT "eventId", COUNT(id), COUNT("checkedInAt") FROM "Registrations" GROUP BY "eventId"
// COUNT(column) skips NULLs, so COUNT("checkedInAt") is exactly the number checked in.
async function countsByEvent(eventIds) {
  if (eventIds.length === 0) return new Map();
  const rows = await Registration.findAll({
    attributes: ['eventId', [fn('COUNT', col('id')), 'registered'], [fn('COUNT', col('checkedInAt')), 'checkedIn']],
    where: { eventId: eventIds },
    group: ['eventId'],
    raw: true,
  });
  // PostgreSQL returns COUNT as a string (it can exceed JavaScript's safe integers).
  return new Map(rows.map((r) => [r.eventId, { registered: Number(r.registered), checkedIn: Number(r.checkedIn) }]));
}

// eventId -> this student's registration, so cards can show "Registered" instead of "Register".
async function registrationsOfUser(userId) {
  const rows = await Registration.findAll({ where: { userId }, attributes: ['eventId', 'registrationId', 'status'] });
  return new Map(rows.map((r) => [r.eventId, r]));
}

// The JSON shape of an event everywhere in the API.
function toEventJSON(event, counts = { registered: 0, checkedIn: 0 }, myRegistration = null) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    date: event.date,
    startTime: String(event.startTime).slice(0, 5),
    venue: event.venue,
    capacity: event.capacity,
    organizer: event.organizer,
    organizerId: event.organizerId,
    registeredCount: counts.registered,
    checkedInCount: counts.checkedIn,
    seatsLeft: Math.max(event.capacity - counts.registered, 0),
    hasStarted: eventStart(event) <= new Date(),
    myRegistrationId: myRegistration ? myRegistration.registrationId : null,
  };
}

// The JSON shape of a digital pass.
function toPassJSON(registration, event, user) {
  return {
    registrationId: registration.registrationId,
    status: registration.status,
    checkedInAt: registration.checkedInAt,
    registeredAt: registration.createdAt,
    event: event ? toEventJSON(event) : undefined,
    student: user ? { name: user.name, email: user.email } : undefined,
  };
}

module.exports = { countsByEvent, registrationsOfUser, toEventJSON, toPassJSON };
