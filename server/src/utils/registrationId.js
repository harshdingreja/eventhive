const crypto = require('crypto');

// No 0/O, 1/I/L: these look alike, and volunteers type IDs by hand when a camera fails.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

// Returns something like "EH-7K3F-9Q2A". crypto.randomInt is cryptographically random,
// so IDs cannot be guessed from earlier ones. 31^8 is about 850 billion possibilities.
function generateRegistrationId() {
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return `EH-${code.slice(0, 4)}-${code.slice(4)}`;
}

// Accepts what a person might type ("eh7k3f9q2a", "EH 7K3F 9Q2A") and returns the
// canonical "EH-7K3F-9Q2A", or null if it cannot be a registration ID at all.
function normalizeRegistrationId(raw) {
  const compact = String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = compact.startsWith('EH') ? compact.slice(2) : compact;
  if (body.length !== 8) return null;
  return `EH-${body.slice(0, 4)}-${body.slice(4)}`;
}

module.exports = { generateRegistrationId, normalizeRegistrationId };
