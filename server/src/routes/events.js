const express = require('express');
const { Op } = require('sequelize');
const { sequelize, Event, Registration, User } = require('../models');
const EntryLog = require('../models/EntryLog');
const AppError = require('../utils/AppError');
const { validateEvent, parseId } = require('../utils/validators');
const { localDateString } = require('../utils/dates');
const { requireAuth, requireRole } = require('../middleware/auth');
const { registerForEvent } = require('../services/registrationService');
const { countsByEvent, registrationsOfUser, toEventJSON, toPassJSON } = require('../services/eventQueries');
const { activity } = require('../events/activity');

const router = express.Router();
router.use(requireAuth); // every events route needs a logged-in user

// GET /api/events -> students see upcoming events, admins see all of them.
// Search and filtering happen in the browser (see client/src/lib/filters.js),
// which gives instant results for a college-sized list of events.
router.get('/', async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const where = isAdmin ? {} : { date: { [Op.gte]: localDateString() } };
  const events = await Event.findAll({ where, order: [['date', 'ASC'], ['startTime', 'ASC']] });

  const counts = await countsByEvent(events.map((e) => e.id));
  const mine = isAdmin ? new Map() : await registrationsOfUser(req.user.id);

  res.json({ events: events.map((e) => toEventJSON(e, counts.get(e.id), mine.get(e.id))) });
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const event = await Event.findByPk(id);
  if (!event) throw new AppError(404, 'Event not found');

  const counts = await countsByEvent([id]);
  const mine = req.user.role === 'student' ? await registrationsOfUser(req.user.id) : new Map();
  res.json({ event: toEventJSON(event, counts.get(id), mine.get(id)) });
});

// POST /api/events (admin) -> create
router.post('/', requireRole('admin'), async (req, res) => {
  const value = validateEvent(req.body ?? {}, { isNew: true });
  const event = await Event.create({ ...value, organizerId: req.user.id });
  activity.emit('event_saved', { action: 'created', event, adminName: req.user.name });
  res.status(201).json({ event: toEventJSON(event) });
});

// PUT /api/events/:id (admin) -> update
router.put('/:id', requireRole('admin'), async (req, res) => {
  const id = parseId(req.params.id);
  const value = validateEvent(req.body ?? {}, { isNew: false });

  // Lock the row like registration does, so capacity can't drop below the number of
  // registrations while a student is registering at the same moment.
  const event = await sequelize.transaction(async (transaction) => {
    const existing = await Event.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!existing) throw new AppError(404, 'Event not found');

    const taken = await Registration.count({ where: { eventId: id }, transaction });
    if (value.capacity < taken) {
      throw new AppError(400, 'Please fix the highlighted fields', {
        capacity: `${taken} students are already registered, so capacity must be at least ${taken}`,
      });
    }
    return existing.update(value, { transaction });
  });

  activity.emit('event_saved', { action: 'updated', event, adminName: req.user.name });
  const counts = await countsByEvent([id]);
  res.json({ event: toEventJSON(event, counts.get(id)) });
});

// DELETE /api/events/:id (admin) -> registrations go too (ON DELETE CASCADE)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const id = parseId(req.params.id);
  const event = await Event.findByPk(id);
  if (!event) throw new AppError(404, 'Event not found');

  await event.destroy();
  try {
    await EntryLog.deleteMany({ eventId: id }); // its gate logs are meaningless now
  } catch (err) {
    console.error('Could not delete entry logs:', err.message);
  }
  activity.emit('event_saved', { action: 'deleted', event, adminName: req.user.name });
  res.status(204).end();
});

// POST /api/events/:id/register (student) -> a new pass
router.post('/:id/register', requireRole('student'), async (req, res) => {
  const eventId = parseId(req.params.id);
  const { registration, event } = await registerForEvent({ userId: req.user.id, eventId });
  activity.emit('registered', { user: req.user, event, registration });
  res.status(201).json({ pass: toPassJSON(registration, event, req.user) });
});

// GET /api/events/:id/participants?search=priya (admin)
// The search runs in PostgreSQL: ILIKE is a case-insensitive LIKE, and '$User.name$'
// lets the WHERE clause look at a column of the joined Users table.
router.get('/:id/participants', requireRole('admin'), async (req, res) => {
  const eventId = parseId(req.params.id);
  const event = await Event.findByPk(eventId);
  if (!event) throw new AppError(404, 'Event not found');

  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const where = { eventId };
  if (search) {
    const pattern = `%${search}%`;
    where[Op.or] = [
      { registrationId: { [Op.iLike]: pattern } },
      { '$User.name$': { [Op.iLike]: pattern } },
      { '$User.email$': { [Op.iLike]: pattern } },
    ];
  }

  const registrations = await Registration.findAll({
    where,
    include: [{ model: User, attributes: ['id', 'name', 'email'] }],
    order: [['createdAt', 'ASC']],
  });

  res.json({
    participants: registrations.map((r) => ({
      registrationId: r.registrationId,
      status: r.status,
      checkedInAt: r.checkedInAt,
      registeredAt: r.createdAt,
      student: { id: r.User.id, name: r.User.name, email: r.User.email },
    })),
  });
});

module.exports = router;
