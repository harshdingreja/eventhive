const { sequelize, Event, Registration } = require('../models');
const AppError = require('../utils/AppError');
const { generateRegistrationId } = require('../utils/registrationId');
const { eventStart } = require('../utils/dates');

// Registers a student for an event without ever overbooking it.
//
// The problem: two students click "Register" for the last seat at the same moment.
// Both read "49 of 50 taken", both insert, and the event ends up with 51.
//
// The fix: do the check and the insert inside one transaction, and lock the event's
// row first (SELECT ... FOR UPDATE). The second request waits at the lock until the
// first one commits, then reads the updated count and gets "event is full".
async function registerForEvent({ userId, eventId }) {
  return sequelize.transaction(async (transaction) => {
    const event = await Event.findByPk(eventId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!event) throw new AppError(404, 'Event not found');
    if (eventStart(event) <= new Date()) throw new AppError(400, 'This event has already started');

    const existing = await Registration.findOne({ where: { userId, eventId }, transaction });
    if (existing) {
      throw new AppError(409, 'You are already registered for this event', {
        registrationId: existing.registrationId,
      });
    }

    const taken = await Registration.count({ where: { eventId }, transaction });
    if (taken >= event.capacity) throw new AppError(409, 'Sorry, this event is full');

    const registration = await Registration.create(
      { userId, eventId, registrationId: generateRegistrationId() },
      { transaction },
    );
    return { registration, event };
  });
  // If anything above throws, Sequelize rolls the whole transaction back automatically.
}

module.exports = { registerForEvent };
