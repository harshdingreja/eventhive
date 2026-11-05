const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');
const { User } = require('../models');

// After login the browser gets a signed token (a JWT). It sends it back on every
// request in the header "Authorization: Bearer <token>". Only the server knows the
// secret, so a token cannot be forged or edited (e.g. changing role to "admin").
function signToken(user) {
  return jwt.sign({ role: user.role }, config.jwtSecret, {
    subject: String(user.id),
    expiresIn: '7d',
  });
}

// Middleware: rejects the request unless it carries a valid token, then puts the
// logged-in user on req.user for the route handlers that run after it.
async function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'Please log in first');
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new AppError(401, 'Your session has expired. Please log in again');
  }

  // Load the user fresh from the database, so a deleted account's old token stops working.
  const user = await User.findByPk(Number(payload.sub));
  if (!user) throw new AppError(401, 'Your account no longer exists');

  req.user = user;
  next();
}

// Middleware factory: requireRole('admin') lets only admins through.
function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      throw new AppError(403, role === 'admin' ? 'Only admins can do this' : 'Only students can do this');
    }
    next();
  };
}

module.exports = { signToken, requireAuth, requireRole };
