const express = require('express');
const { Registration, Event, User } = require('../models');
const AppError = require('../utils/AppError');
const { requireAuth } = require('../middleware/auth');
const { normalizeRegistrationId } = require('../utils/registrationId');
const { toPassJSON } = require('../services/eventQueries');

const router = express.Router();
router.use(requireAuth);

// GET /api/registrations/me -> all of the logged-in student's passes, soonest first
router.get('/me', async (req, res) => {
  const registrations = await Registration.findAll({
    where: { userId: req.user.id },
    include: [Event],
    order: [
      [Event, 'date', 'ASC'],
      [Event, 'startTime', 'ASC'],
    ],
  });
  res.json({ passes: registrations.map((r) => toPassJSON(r, r.Event, req.user)) });
});

// GET /api/registrations/EH-7K3F-9Q2A -> one pass.
// Students may open only their own passes; admins may open any.
router.get('/:registrationId', async (req, res) => {
  const registrationId = normalizeRegistrationId(req.params.registrationId);
  if (!registrationId) throw new AppError(404, 'Pass not found');

  const registration = await Registration.findOne({ where: { registrationId }, include: [Event, User] });
  if (!registration) throw new AppError(404, 'Pass not found');

  const isOwner = registration.userId === req.user.id;
  if (!isOwner && req.user.role !== 'admin') throw new AppError(403, 'This pass belongs to another student');

  res.json({ pass: toPassJSON(registration, registration.Event, registration.User) });
});

module.exports = router;
