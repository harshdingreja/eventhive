const { Event, Registration, User } = require('../models');
const EntryLog = require('../models/EntryLog');
const AppError = require('../utils/AppError');
const { normalizeRegistrationId } = require('../utils/registrationId');
const { activity } = require('../events/activity');

const MESSAGES = {
  success: 'Checked in. Welcome!',
  already_checked_in: 'This pass was already used',
  not_found: 'No pass with this ID',
  wrong_event: 'This pass is for a different event',
};

// Checks a pass in at the gate of `eventId`. Always resolves with a result object;
// a rejected pass is a normal outcome at a gate, not a server error.
async function checkIn({ rawId, eventId, method, admin }) {
  const gateEvent = await Event.findByPk(eventId);
  if (!gateEvent) throw new AppError(404, 'Event not found');

  const registrationId = normalizeRegistrationId(rawId);
  let result = 'not_found';
  let registration = null;

  if (registrationId) {
    // One atomic UPDATE ... WHERE status = 'registered'. If two volunteers scan the
    // same pass at the same instant, PostgreSQL applies the updates one at a time;
    // the second finds the status already changed, so it updates 0 rows.
    const [updatedRows] = await Registration.update(
      { status: 'checked_in', checkedInAt: new Date() },
      { where: { registrationId, eventId, status: 'registered' } },
    );

    registration = await Registration.findOne({
      where: { registrationId },
      include: [{ model: User, attributes: ['id', 'name', 'email'] }, { model: Event, attributes: ['id', 'title'] }],
    });

    if (updatedRows === 1) result = 'success';
    else if (!registration) result = 'not_found';
    else if (registration.eventId !== eventId) result = 'wrong_event';
    else result = 'already_checked_in';
  }

  const student = registration ? { name: registration.User.name, email: registration.User.email } : undefined;

  // Write the attempt to MongoDB. The check-in already happened in PostgreSQL, so if
  // MongoDB is down we log the problem instead of telling the volunteer it failed.
  try {
    await EntryLog.create({
      registrationId: registrationId || String(rawId ?? '').slice(0, 40) || '(empty)',
      eventId,
      eventTitle: gateEvent.title,
      result,
      method,
      student,
      registeredFor:
        result === 'wrong_event' ? { eventId: registration.Event.id, title: registration.Event.title } : undefined,
      scannedBy: { id: admin.id, name: admin.name },
    });
  } catch (err) {
    console.error('Could not write entry log:', err.message);
  }

  if (result === 'success') {
    activity.emit('checked_in', {
      registrationId,
      studentEmail: student.email,
      eventTitle: gateEvent.title,
      adminName: admin.name,
    });
  }

  return {
    result,
    ok: result === 'success',
    message: MESSAGES[result],
    pass: registration
      ? {
          registrationId: registration.registrationId,
          status: registration.status,
          checkedInAt: registration.checkedInAt,
          student,
          event: { id: registration.Event.id, title: registration.Event.title },
        }
      : null,
  };
}

module.exports = { checkIn };
