const express = require('express');
const { Event, User } = require('../models');
const EntryLog = require('../models/EntryLog');
const { requireAuth, requireRole } = require('../middleware/auth');
const { countsByEvent } = require('../services/eventQueries');
const { readRecentLines } = require('../events/activity');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

// GET /api/stats -> totals for the admin dashboard plus one row per event
router.get('/', async (req, res) => {
  const events = await Event.findAll({ order: [['date', 'ASC'], ['startTime', 'ASC']] });
  const counts = await countsByEvent(events.map((e) => e.id));

  const perEvent = events.map((event) => {
    const { registered, checkedIn } = counts.get(event.id) || { registered: 0, checkedIn: 0 };
    return {
      id: event.id,
      title: event.title,
      date: event.date,
      capacity: event.capacity,
      registered,
      checkedIn,
      fillPercent: Math.round((registered / event.capacity) * 100),
    };
  });

  // reduce() folds the per-event rows into one totals object.
  const totals = perEvent.reduce(
    (sum, e) => ({
      events: sum.events + 1,
      capacity: sum.capacity + e.capacity,
      registrations: sum.registrations + e.registered,
      checkIns: sum.checkIns + e.checkedIn,
    }),
    { events: 0, capacity: 0, registrations: 0, checkIns: 0 },
  );

  const students = await User.count({ where: { role: 'student' } });

  // Rejected scans come from MongoDB. If it is unreachable, show the rest anyway.
  let rejectedScans = null;
  try {
    rejectedScans = await EntryLog.countDocuments({ result: { $ne: 'success' } });
  } catch (err) {
    console.error('Could not count entry logs:', err.message);
  }

  res.json({ totals: { ...totals, students, rejectedScans }, perEvent });
});

// GET /api/stats/activity -> newest lines of logs/activity.log, read with a callback
router.get('/activity', (req, res, next) => {
  readRecentLines(30, (err, lines) => {
    if (err) return next(err);
    return res.json({ lines });
  });
});

module.exports = router;
