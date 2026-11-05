const express = require('express');
const mongoose = require('mongoose');
const EntryLog = require('../models/EntryLog');
const AppError = require('../utils/AppError');
const { requireAuth, requireRole } = require('../middleware/auth');
const { parseId } = require('../utils/validators');

// Full CRUD on the MongoDB gate log (Experiment 11). Create happens in the check-in
// service, once per scan; these routes read, annotate and delete entries.
const router = express.Router();
router.use(requireAuth, requireRole('admin'));

const RESULTS = ['success', 'already_checked_in', 'not_found', 'wrong_event'];

function parseObjectId(id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, 'Invalid log id');
  return id;
}

// GET /api/entry-logs?eventId=3&result=not_found&limit=50 -> newest first
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.eventId) filter.eventId = parseId(req.query.eventId, 'event');
  if (RESULTS.includes(req.query.result)) filter.result = req.query.result;
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  const logs = await EntryLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ logs });
});

// PATCH /api/entry-logs/:id  { note } -> e.g. "Checked ID card, let in manually"
router.patch('/:id', async (req, res) => {
  const id = parseObjectId(req.params.id);
  const note = req.body?.note;
  if (typeof note !== 'string') throw new AppError(400, 'note must be text');

  const log = await EntryLog.findByIdAndUpdate(
    id,
    { note },
    { returnDocument: 'after', runValidators: true }, // run maxlength on updates too
  ).lean();
  if (!log) throw new AppError(404, 'Log entry not found');
  res.json({ log });
});

// DELETE /api/entry-logs/:id -> remove one entry
router.delete('/:id', async (req, res) => {
  const id = parseObjectId(req.params.id);
  const deleted = await EntryLog.findByIdAndDelete(id);
  if (!deleted) throw new AppError(404, 'Log entry not found');
  res.status(204).end();
});

// DELETE /api/entry-logs?eventId=3 -> clear one event's log (eventId is required,
// so a missing parameter can never wipe every event's history)
router.delete('/', async (req, res) => {
  const eventId = parseId(req.query.eventId, 'event');
  const { deletedCount } = await EntryLog.deleteMany({ eventId });
  res.json({ deleted: deletedCount });
});

module.exports = router;
