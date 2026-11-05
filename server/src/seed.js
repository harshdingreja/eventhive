// Resets both databases and fills them with demo data: one admin, six students,
// eight COG events (one full, one starting in 50 minutes, one already over).
// Run it again on the morning of a demo so the dates are relative to that day.
//   npm run seed
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('./config');
const { sequelize, User, Event, Registration } = require('./models');
const EntryLog = require('./models/EntryLog');
const { connectMongo, disconnectMongo } = require('./db/mongo');
const { generateRegistrationId } = require('./utils/registrationId');
const { localDateString, addDays } = require('./utils/dates');

// Demo accounts: local test values only, also listed in the README.
const ADMIN = { name: 'COG Admin', email: 'admin@eventhive.test', password: 'Admin@123' };
const STUDENT_PASSWORD = 'Student@123';
const STUDENTS = [
  { key: 'harsh', name: 'Harsh Dingreja' },
  { key: 'priya', name: 'Priya Sharma' },
  { key: 'aarav', name: 'Aarav Mehta' },
  { key: 'sneha', name: 'Sneha Iyer' },
  { key: 'rohan', name: 'Rohan Kulkarni' },
  { key: 'ananya', name: 'Ananya Rao' },
];

const hhmm = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

function eventSpecs(now) {
  const day = (n) => localDateString(addDays(now, n));
  const soon = new Date(now.getTime() + 50 * 60_000); // for the reminder job demo

  return [
    {
      key: 'hackathon', title: 'CodeSprint 24-Hour Hackathon', category: 'Technical', date: day(3), startTime: '09:00',
      venue: 'Seminar Hall, 4th Floor', capacity: 80, organizer: 'CSI VESIT',
      description: 'Form teams of up to four and build something real in 24 hours. Mentors from industry, midnight snacks, and prizes for the top three teams.',
    },
    {
      key: 'figma', title: 'UI/UX Design with Figma', category: 'Workshop', date: day(2), startTime: '14:00',
      venue: 'Computer Lab 405', capacity: 3, organizer: 'ISTE VESIT',
      description: 'A hands-on afternoon on wireframes, auto layout and prototyping in Figma. Bring a laptop with Figma installed. Seats are very limited.',
    },
    {
      key: 'ai-talk', title: 'AI in Healthcare: Guest Talk', category: 'Seminar', date: day(4), startTime: '11:00',
      venue: 'Main Auditorium', capacity: 150, organizer: 'AI & DS Department',
      description: 'A practising radiologist and an ML engineer discuss how image models are used in hospitals today, and where they still fail.',
    },
    {
      key: 'garba', title: 'Navratri Garba Night', category: 'Cultural', date: day(6), startTime: '18:30',
      venue: 'College Ground', capacity: 300, organizer: 'Cultural Council',
      description: 'Dandiya, garba and live dhol. Traditional wear encouraged; best-dressed awards at the end of the night.',
    },
    {
      key: 'cricket', title: 'Box Cricket League', category: 'Sports', date: day(9), startTime: '08:00',
      venue: 'Sports Turf', capacity: 48, organizer: 'Sports Council',
      description: 'Six-a-side box cricket between departments. Register individually and we will form balanced teams.',
    },
    {
      key: 'mixer', title: "Freshers' Mixer", category: 'Social', date: day(12), startTime: '17:00',
      venue: 'Student Lounge', capacity: 120, organizer: 'Council of Organizations',
      description: 'Meet every club on campus in one evening. Games, music and a chance to sign up for the committees you like.',
    },
    {
      key: 'mock', title: 'Placement Prep: Mock Interviews', category: 'Seminar', date: localDateString(soon),
      startTime: hhmm(soon), venue: 'Conference Room 2', capacity: 25, organizer: 'Training & Placement Cell',
      description: 'Fifteen-minute mock technical interviews with seniors who cleared campus placements. Bring a printed resume.',
    },
    {
      key: 'quiz', title: 'Tech Quiz Championship', category: 'Technical', date: day(-1), startTime: '15:00',
      venue: 'Room 302', capacity: 40, organizer: 'IEEE VESIT',
      description: 'Three rounds of rapid-fire questions on computing history, puzzles and current tech. Already over: see its check-ins.',
    },
  ];
}

// eventKey -> students registered for it
const REGISTRATIONS = {
  hackathon: ['harsh', 'priya', 'rohan', 'ananya', 'aarav'],
  figma: ['priya', 'aarav', 'sneha'], // fills it: capacity 3
  'ai-talk': ['harsh', 'sneha'],
  garba: ['harsh', 'ananya', 'sneha'],
  mock: ['harsh', 'priya', 'sneha', 'rohan'],
  quiz: ['harsh', 'priya', 'aarav', 'sneha', 'rohan', 'ananya'],
};
const CHECKED_IN_AT_QUIZ = ['harsh', 'priya', 'aarav', 'rohan'];

async function seed() {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to wipe a production database');

  await sequelize.authenticate();
  await sequelize.sync({ force: true }); // drops and recreates every table
  await connectMongo(config.mongoUrl);
  await EntryLog.deleteMany({});
  fs.rmSync(path.join(config.logDir, 'activity.log'), { force: true }); // fresh activity feed too

  const now = new Date();
  const admin = await User.create({
    name: ADMIN.name, email: ADMIN.email, role: 'admin',
    passwordHash: await bcrypt.hash(ADMIN.password, 10),
  });

  const studentHash = await bcrypt.hash(STUDENT_PASSWORD, 10);
  const students = {};
  for (const s of STUDENTS) {
    students[s.key] = await User.create({ name: s.name, email: `${s.key}@eventhive.test`, passwordHash: studentHash });
  }

  const events = {};
  for (const { key, ...fields } of eventSpecs(now)) {
    events[key] = await Event.create({ ...fields, organizerId: admin.id });
  }

  const passes = {}; // "quiz:harsh" -> registration
  for (const [eventKey, studentKeys] of Object.entries(REGISTRATIONS)) {
    for (const studentKey of studentKeys) {
      const checkedIn = eventKey === 'quiz' && CHECKED_IN_AT_QUIZ.includes(studentKey);
      passes[`${eventKey}:${studentKey}`] = await Registration.create({
        userId: students[studentKey].id,
        eventId: events[eventKey].id,
        registrationId: generateRegistrationId(),
        status: checkedIn ? 'checked_in' : 'registered',
        checkedInAt: checkedIn ? addDays(now, -1) : null,
      });
    }
  }

  // Gate log for yesterday's quiz: four entries, one pass used twice, one unknown ID.
  // insertMany on the raw collection keeps our own past timestamps.
  const quiz = events.quiz;
  const scannedBy = { id: admin.id, name: admin.name };
  const minutesAfterStart = (m) => new Date(`${quiz.date}T15:00:00`).getTime() + m * 60_000;
  const logFor = (studentKey, result, minute) => {
    const reg = passes[`quiz:${studentKey}`];
    const at = new Date(minutesAfterStart(minute));
    return {
      registrationId: reg.registrationId, eventId: quiz.id, eventTitle: quiz.title, result, method: 'camera',
      student: { name: students[studentKey].name, email: students[studentKey].email },
      scannedBy, note: '', createdAt: at, updatedAt: at,
    };
  };
  const unknownAt = new Date(minutesAfterStart(9));
  await EntryLog.collection.insertMany([
    logFor('harsh', 'success', -12),
    logFor('priya', 'success', -10),
    logFor('aarav', 'success', -6),
    logFor('harsh', 'already_checked_in', -4),
    logFor('rohan', 'success', 3),
    {
      registrationId: 'EH-QQQQ-7777', eventId: quiz.id, eventTitle: quiz.title, result: 'not_found', method: 'manual',
      scannedBy, note: 'Student had a screenshot of a friend\'s pass', createdAt: unknownAt, updatedAt: unknownAt,
    },
  ]);

  console.log('Seeded EventHive demo data:');
  console.log(`  admin    ${ADMIN.email} / ${ADMIN.password}`);
  console.log(`  students harsh@eventhive.test (and priya, aarav, sneha, rohan, ananya) / ${STUDENT_PASSWORD}`);
  console.log(`  ${Object.keys(events).length} events, ${Object.keys(passes).length} registrations, 6 gate log entries`);
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
    await disconnectMongo();
  });
