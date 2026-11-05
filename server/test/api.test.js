// Integration tests: start the real Express app on a random port and talk to it over
// HTTP, against separate test databases (eventhive_test), exactly like the React app would.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const os = require('node:os');
const path = require('node:path');

// Settings must be in place before any app file is loaded, because config.js reads them once.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://localhost:5432/eventhive_test';
process.env.MONGO_URL = process.env.TEST_MONGO_URL || 'mongodb://127.0.0.1:27017/eventhive_test';
process.env.JWT_SECRET = 'test-secret';
process.env.LOG_DIR = path.join(os.tmpdir(), 'eventhive-test-logs');

const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../src/models');
const EntryLog = require('../src/models/EntryLog');
const { connectMongo, disconnectMongo } = require('../src/db/mongo');
const createApp = require('../src/app');
const { localDateString, addDays } = require('../src/utils/dates');

let server;
let baseUrl;
let adminToken;
const tomorrow = localDateString(addDays(new Date(), 1));

async function api(method, url, { token, body } = {}) {
  const res = await fetch(baseUrl + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

let studentCounter = 0;
async function newStudent() {
  studentCounter += 1;
  const res = await api('POST', '/api/auth/signup', {
    body: { name: `Student ${studentCounter}`, email: `student${studentCounter}@test.local`, password: 'Passw0rd' },
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.token;
}

async function createEvent(overrides = {}) {
  const res = await api('POST', '/api/events', {
    token: adminToken,
    body: {
      title: 'Test Event',
      description: 'An event created by the test suite',
      category: 'Technical',
      date: tomorrow,
      startTime: '10:00',
      venue: 'Hall A',
      organizer: 'CSI',
      capacity: 2,
      ...overrides,
    },
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.event;
}

before(async () => {
  await sequelize.sync({ force: true }); // fresh tables for every test run
  await connectMongo(process.env.MONGO_URL);
  await EntryLog.deleteMany({});
  await User.create({
    name: 'Test Admin',
    email: 'admin@test.local',
    passwordHash: await bcrypt.hash('Admin1234', 4),
    role: 'admin',
  });

  server = createApp().listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const login = await api('POST', '/api/auth/login', { body: { email: 'admin@test.local', password: 'Admin1234' } });
  adminToken = login.body.token;
});

after(async () => {
  server.close();
  await sequelize.close();
  await disconnectMongo();
});

test('signup rejects invalid input with a message per field', async () => {
  const res = await api('POST', '/api/auth/signup', { body: { name: 'A', email: 'not-an-email', password: 'short' } });
  assert.equal(res.status, 400);
  assert.ok(res.body.details.name);
  assert.ok(res.body.details.email);
  assert.ok(res.body.details.password);
});

test('login fails with the same message for unknown email and wrong password', async () => {
  const unknown = await api('POST', '/api/auth/login', { body: { email: 'nobody@test.local', password: 'Passw0rd' } });
  const wrong = await api('POST', '/api/auth/login', { body: { email: 'admin@test.local', password: 'Wrong1234' } });
  assert.equal(unknown.status, 401);
  assert.equal(wrong.status, 401);
  assert.equal(unknown.body.error, wrong.body.error);
});

test('requests without a token are rejected', async () => {
  const res = await api('GET', '/api/events');
  assert.equal(res.status, 401);
});

test('students cannot create events', async () => {
  const student = await newStudent();
  const res = await api('POST', '/api/events', { token: student, body: {} });
  assert.equal(res.status, 403);
});

test('capacity is never exceeded, even when students register at the same moment', async () => {
  const event = await createEvent({ capacity: 2 });
  const students = await Promise.all([newStudent(), newStudent(), newStudent(), newStudent()]);

  // Four registrations fired in parallel for two seats.
  const results = await Promise.all(students.map((t) => api('POST', `/api/events/${event.id}/register`, { token: t })));

  assert.deepEqual(results.map((r) => r.status).sort(), [201, 201, 409, 409]);
  const detail = await api('GET', `/api/events/${event.id}`, { token: adminToken });
  assert.equal(detail.body.event.registeredCount, 2);
  assert.equal(detail.body.event.seatsLeft, 0);
});

test('a student cannot register twice for the same event', async () => {
  const event = await createEvent({ capacity: 10 });
  const student = await newStudent();
  const first = await api('POST', `/api/events/${event.id}/register`, { token: student });
  const second = await api('POST', `/api/events/${event.id}/register`, { token: student });

  assert.equal(first.status, 201);
  assert.match(first.body.pass.registrationId, /^EH-[2-9A-Z]{4}-[2-9A-Z]{4}$/);
  assert.equal(second.status, 409);
  assert.equal(second.body.details.registrationId, first.body.pass.registrationId);
});

test('check-in succeeds once, then reports the pass as used; every scan is logged in MongoDB', async () => {
  const event = await createEvent({ capacity: 10 });
  const otherEvent = await createEvent({ capacity: 10, title: 'Other Event' });
  const student = await newStudent();
  const { pass } = (await api('POST', `/api/events/${event.id}/register`, { token: student })).body;

  const scan = (registrationId, eventId) =>
    api('POST', '/api/checkin', { token: adminToken, body: { registrationId, eventId, method: 'manual' } });

  const first = await scan(pass.registrationId, event.id);
  const again = await scan(pass.registrationId.toLowerCase().replaceAll('-', ''), event.id); // typed by hand
  const wrongGate = await scan(pass.registrationId, otherEvent.id);
  const unknown = await scan('EH-ZZZZ-ZZZZ', event.id);

  assert.equal(first.body.result, 'success');
  assert.ok(first.body.pass.checkedInAt);
  assert.equal(again.body.result, 'already_checked_in');
  assert.equal(wrongGate.body.result, 'wrong_event');
  assert.equal(unknown.body.result, 'not_found');

  const logs = await EntryLog.find({ eventId: { $in: [event.id, otherEvent.id] } }).lean();
  assert.equal(logs.length, 4);
  const wrongLog = logs.find((l) => l.result === 'wrong_event');
  assert.equal(wrongLog.registeredFor.title, 'Test Event');
});

test('two simultaneous scans of one pass check it in only once', async () => {
  const event = await createEvent({ capacity: 10 });
  const student = await newStudent();
  const { pass } = (await api('POST', `/api/events/${event.id}/register`, { token: student })).body;

  const body = { registrationId: pass.registrationId, eventId: event.id };
  const results = await Promise.all([
    api('POST', '/api/checkin', { token: adminToken, body }),
    api('POST', '/api/checkin', { token: adminToken, body }),
  ]);
  assert.deepEqual(results.map((r) => r.body.result).sort(), ['already_checked_in', 'success']);
});

test("students can open their own pass but not another student's", async () => {
  const event = await createEvent({ capacity: 10 });
  const owner = await newStudent();
  const stranger = await newStudent();
  const { pass } = (await api('POST', `/api/events/${event.id}/register`, { token: owner })).body;

  assert.equal((await api('GET', `/api/registrations/${pass.registrationId}`, { token: owner })).status, 200);
  assert.equal((await api('GET', `/api/registrations/${pass.registrationId}`, { token: stranger })).status, 403);
  assert.equal((await api('GET', `/api/registrations/${pass.registrationId}`, { token: adminToken })).status, 200);
});

test('capacity cannot be lowered below the number already registered', async () => {
  const event = await createEvent({ capacity: 5 });
  await api('POST', `/api/events/${event.id}/register`, { token: await newStudent() });
  await api('POST', `/api/events/${event.id}/register`, { token: await newStudent() });

  const res = await api('PUT', `/api/events/${event.id}`, { token: adminToken, body: { ...event, capacity: 1 } });
  assert.equal(res.status, 400);
  assert.match(res.body.details.capacity, /2 students/);
});

test('participants can be searched by name, email or registration ID', async () => {
  const event = await createEvent({ capacity: 10 });
  const student = await newStudent();
  const { pass } = (await api('POST', `/api/events/${event.id}/register`, { token: student })).body;
  await api('POST', `/api/events/${event.id}/register`, { token: await newStudent() });

  const url = (q) => `/api/events/${event.id}/participants?search=${encodeURIComponent(q)}`;
  const byId = await api('GET', url(pass.registrationId.slice(3)), { token: adminToken });
  const byName = await api('GET', url(pass.student.name.toUpperCase()), { token: adminToken });
  const all = await api('GET', url(''), { token: adminToken });

  assert.equal(byId.body.participants.length, 1);
  assert.equal(byName.body.participants.length, 1);
  assert.equal(all.body.participants.length, 2);
});

test('entry logs support reading, adding a note and deleting', async () => {
  const event = await createEvent({ capacity: 10 });
  await api('POST', '/api/checkin', { token: adminToken, body: { registrationId: 'garbage', eventId: event.id } });

  const list = await api('GET', `/api/entry-logs?eventId=${event.id}`, { token: adminToken });
  assert.equal(list.body.logs.length, 1);
  const id = list.body.logs[0]._id;

  const patched = await api('PATCH', `/api/entry-logs/${id}`, { token: adminToken, body: { note: 'Asked to re-register' } });
  assert.equal(patched.body.log.note, 'Asked to re-register');

  assert.equal((await api('DELETE', `/api/entry-logs/${id}`, { token: adminToken })).status, 204);
  const after = await api('GET', `/api/entry-logs?eventId=${event.id}`, { token: adminToken });
  assert.equal(after.body.logs.length, 0);
});

test('deleting an event removes its registrations', async () => {
  const event = await createEvent({ capacity: 10 });
  const student = await newStudent();
  const { pass } = (await api('POST', `/api/events/${event.id}/register`, { token: student })).body;

  assert.equal((await api('DELETE', `/api/events/${event.id}`, { token: adminToken })).status, 204);
  assert.equal((await api('GET', `/api/registrations/${pass.registrationId}`, { token: student })).status, 404);
});
