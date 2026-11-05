const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { parseId } = require('../utils/validators');
const { checkIn } = require('../services/checkinService');

const router = express.Router();

// POST /api/checkin  { registrationId, eventId, method: 'camera' | 'manual' } (admin)
// Answers 200 with { ok, result, message, pass } for every scan: "already used" is a
// normal answer at a gate, so the scanner screen reads `result` to decide what to show.
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const body = req.body ?? {};
  const eventId = parseId(body.eventId, 'event');
  const method = body.method === 'camera' ? 'camera' : 'manual';

  const outcome = await checkIn({ rawId: body.registrationId, eventId, method, admin: req.user });
  res.json(outcome);
});

module.exports = router;
