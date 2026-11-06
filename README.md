# EventHive

Digital event passes for COG (Council of Organizations) college events. Students register for an event and get a pass with a QR code; volunteers scan the pass at the door; admins see registrations and turnout live.

Built only with the technologies from the Full Stack Development lab (NADPC53): HTML, CSS, JavaScript, React + Vite, Node.js, Express, PostgreSQL + Sequelize, MongoDB + Mongoose. [docs/experiment-mapping.md](docs/experiment-mapping.md) shows where each of the 13 experiments lives in the code.

## Features

**Students**
- Sign up and log in (email + password, validated in the browser and on the server)
- Browse upcoming events as cards; search, and filter by category, date and seat availability
- Register in one click. Seat limits and duplicate registrations are enforced in a database transaction
- Get a digital pass with a unique registration ID and QR code; see all passes, print one

**Admins**
- Create, edit and delete events
- See participants per event and search them by name, email or registration ID
- Gate check-in: scan the QR with a camera or type the ID; a pass works only once
- Gate log in MongoDB: every scan attempt (accepted, already used, wrong event, unknown), with notes
- Dashboard with registrations, capacity, check-ins, rejected scans and recent server activity

## Architecture

```
React + Vite (client/, port 5173)
   │  fetch("/api/...")  with  Authorization: Bearer <JWT>
   ▼
Express API (server/, port 4000)
   ├── middleware: CORS, JSON body, request logger, auth (JWT + role), error handler
   ├── PostgreSQL via Sequelize: users, events, registrations
   │     registration = transaction + row lock (no overbooking)
   │     check-in     = atomic conditional UPDATE (no double entry)
   ├── MongoDB via Mongoose: entrylogs (one document per gate scan)
   └── Node event loop: EventEmitter → fs.appendFile(activity.log), setInterval reminder job
```

**Why two databases?** PostgreSQL holds data that must never become inconsistent: seats, registrations and check-ins, protected by transactions and constraints. MongoDB holds the gate log: an append-only stream of scans whose shape changes with the result, and which never needs joins or transactions.

**Security choices**
- Passwords are stored as bcrypt hashes, never as plain text.
- Login returns a signed JWT. Every API route checks it, and admin routes also check the role.
- Students can open only their own passes; the server enforces it, not only the UI.
- The QR code encodes only the random registration ID (e.g. `EH-7K3F-9Q2A`), never the name or email.

## Run it locally

Needs Node 22+, PostgreSQL and MongoDB running locally.

```bash
createdb eventhive
createdb eventhive_test
npm run install:all
cp server/.env.example server/.env
npm run seed
npm run dev
```

Open http://localhost:5173. If that port is busy, Vite picks the next free one and prints it.

**Run `npm run seed` again on the morning of a demo.** Event dates are relative to the day you seed, including one event that starts 50 minutes later so the reminder job has something to announce.

### Demo accounts (created by the seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@eventhive.test | Admin@123 |
| Student | harsh@eventhive.test | Student@123 |
| Student | priya@, aarav@, sneha@, rohan@, ananya@eventhive.test | Student@123 |

While running `npm run dev`, the login page has buttons that fill these in. Production builds don't show them.

### Environment variables (server/.env)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API port |
| `DATABASE_URL` | `postgres://localhost:5432/eventhive` | PostgreSQL connection |
| `MONGO_URL` | `mongodb://127.0.0.1:27017/eventhive` | MongoDB connection |
| `JWT_SECRET` | dev-only value | Signs login tokens; required in production |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Origins allowed by CORS (comma-separated) |
| `LOG_DIR` | `server/logs` | Where activity.log is written |

The client reads one optional variable, `VITE_API_URL`, for when the API lives on another domain. Locally, Vite forwards `/api` to port 4000.

### Tests

```bash
npm test
```

13 integration tests start the real API against the `eventhive_test` databases. They cover:
- four students racing for two seats
- duplicate registration
- two volunteers scanning the same pass at once
- wrong-event and unknown passes
- access to another student's pass
- lowering capacity below the number already registered
- participant search
- gate-log CRUD
- cascade delete

### Using the camera scanner

Browsers allow the camera only on `https://` pages or `http://localhost`, so scan from the laptop running the app. To show a pass on a phone, open the "Network" address that Vite prints, on the same Wi-Fi, and log in as the student. Typing the ID works everywhere.

## API

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/api/auth/signup` | anyone | Create a student account |
| POST | `/api/auth/login` | anyone | Get a token |
| GET | `/api/auth/me` | logged in | Current user |
| GET | `/api/events` | logged in | Upcoming events (admins: all), with seat counts |
| GET | `/api/events/:id` | logged in | One event |
| POST | `/api/events` | admin | Create |
| PUT | `/api/events/:id` | admin | Update (capacity ≥ registrations) |
| DELETE | `/api/events/:id` | admin | Delete, with its registrations and gate log |
| POST | `/api/events/:id/register` | student | Register, returns the pass |
| GET | `/api/events/:id/participants?search=` | admin | Participants |
| GET | `/api/registrations/me` | student | My passes |
| GET | `/api/registrations/:registrationId` | owner or admin | One pass |
| POST | `/api/checkin` | admin | Check a pass in at an event's gate |
| GET / PATCH / DELETE | `/api/entry-logs` | admin | Gate log (MongoDB) |
| GET | `/api/stats` | admin | Dashboard numbers |
| GET | `/api/stats/activity` | admin | Recent lines of activity.log |

## Project structure

```
server/src/
  app.js, server.js       Express app and startup
  config.js               settings from environment variables
  db/                     Sequelize and Mongoose connections
  models/                 User, Event, Registration (SQL), EntryLog (Mongo)
  middleware/             auth, requestLogger, errorHandler
  routes/                 auth, events, registrations, checkin, entryLogs, stats
  services/               registration transaction, check-in, event queries
  events/activity.js      EventEmitter + fs callbacks
  jobs/reminderJob.js     setInterval reminders
  seed.js                 demo data
server/test/api.test.js   integration tests
client/public/about.html  static HTML page (Experiment 1) + media/
client/src/
  styles/                 hand-written CSS (tokens, forms, layout, components, pass, gate)
  lib/                    ApiClient class, validators, string and array helpers
  context/AuthContext.jsx logged-in user for the whole app
  hooks/                  useApi, useDebounced
  components/             EventCard, EventFilters, PassTicket, QrScanner, Field, …
  pages/                  Login, Signup, Events, MyPasses, Pass, AdminDashboard, EventForm, EventDetail, CheckIn
```

## Deploying (Experiment 13)

The frontend is a static Vite build (`npm run build` → `client/dist`) and deploys to Vercel. On vercel.com/new, pick this repo under "Import Git Repository" and click Deploy. No settings are needed: the root `vercel.json` tells Vercel to install and build `client/` and serve `client/dist`, and it sends every path to `index.html` so React Router's pages work on refresh.

Without a hosted API, the deployed site shows the About page and every screen, and logging in says "Cannot reach the EventHive server". To connect a hosted API, add the environment variable `VITE_API_URL=https://<your-api-host>/api` in Vercel and redeploy.

The API needs a host that runs Node continuously, because of the reminder job (for example Render or Railway). It also needs hosted databases: Neon for PostgreSQL and MongoDB Atlas. Set the server variables above there, with `CLIENT_ORIGIN` set to the Vercel URL.
