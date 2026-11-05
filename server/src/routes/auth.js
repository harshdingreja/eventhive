const express = require('express');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const AppError = require('../utils/AppError');
const { validateSignup, validateLogin } = require('../utils/validators');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/signup  { name, email, password } -> { token, user }
// Everyone who signs up is a student. Admin accounts are created by the seed script,
// so nobody can make themselves an admin from the signup form.
router.post('/signup', async (req, res) => {
  const { name, email, password } = validateSignup(req.body ?? {});

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw new AppError(409, 'An account with this email already exists', {
      email: 'Already registered. Try logging in instead',
    });
  }

  // bcrypt is deliberately slow (cost 10 = 2^10 rounds) so guessing passwords is slow too.
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role: 'student' });

  res.status(201).json({ token: signToken(user), user: user.toSafeJSON() });
});

// POST /api/auth/login  { email, password } -> { token, user }
router.post('/login', async (req, res) => {
  const { email, password } = validateLogin(req.body ?? {});

  const user = await User.findOne({ where: { email } });
  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

  // Same message for "no such email" and "wrong password", so the form can't be used
  // to discover which emails have accounts.
  if (!passwordMatches) throw new AppError(401, 'Wrong email or password');

  res.json({ token: signToken(user), user: user.toSafeJSON() });
});

// GET /api/auth/me -> the logged-in user (used when the page reloads)
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

module.exports = router;
