# Viva and demo prep

## The 60-second pitch

> EventHive is the event pass system for COG college events. Students register for an event in one click and get a digital pass with a QR code. At the door, a volunteer scans it, and the pass can't be used twice. Admins create events and see registrations and turnout live.
>
> The frontend is React with Vite. It calls a REST API in Express on Node. PostgreSQL, through Sequelize, stores users, events and registrations. Registration runs inside a transaction with a row lock, so an event can never be overbooked, even when students click at the same moment; I have a test that proves it. MongoDB, through Mongoose, stores the gate log: every scan attempt, including rejected ones. Node's event loop handles the activity log, through an EventEmitter and fs callbacks, and a setInterval reminder job. The About page is plain HTML with a table, lists, audio and video.

## Demo script (about 5 minutes)

Before you start: run `npm run seed`, then `npm run dev`. Log in once as each role to check that everything loads.

1. **About page** (Exp 1). From the login page, click "About COG and EventHive". Scroll through the table, the lists, the video and the audio.
2. **Signup validation** (Exp 2, 4b). Click "Create a student account" and submit with a bad email and a short password. Point out the red borders, the "!" badges and the "*" stars, all made by CSS.
3. **Student flow** (Exp 3, 6, 12). Log in with "Student demo".
   - Search "garba", click category chips, and set the availability filter.
   - Point out that the Figma workshop is **Full**.
   - Register for **Box Cricket League**. The pass appears.
4. **Admin flow** (Exp 9, 10). Log out, then use "Admin demo".
   - Dashboard: the stats, and the registration that just happened in "Recent server activity" (Exp 8).
   - Create an event with 1 seat.
5. **Gate** (Exp 11). Open "Gate check-in", choose Box Cricket and type the pass ID.
   - Result: green "Checked in".
   - Type it again: amber "already used".
   - Show both entries in the gate log, and add a note.
6. **Proof** (Exp 10 + tests). In a terminal, run `npm test`: 13 tests pass, including the race tests.

## Questions you are likely to get, with answers

**Why both PostgreSQL and MongoDB?**
They suit different data. Registrations and seats must stay consistent: I need transactions, foreign keys and a unique constraint, which is what a relational database does well. The gate log is an append-only list of scan attempts. Its shape varies (an unknown ID has no student; a wrong-event scan stores which event the pass is for), it never needs joins, and it grows fast. A document database fits that.

**How do you stop an event from being overbooked?**
`registrationService.js`. Inside one transaction I lock the event's row (`SELECT ... FOR UPDATE`), count its registrations, and insert only if there is room. A second request for the same event waits at the lock until the first commits, then sees the new count. Without the lock, both could read "49 of 50" and both insert. My test fires 4 registrations at once for 2 seats and checks that exactly 2 succeed. I removed the lock once to confirm the test then fails.

**How do you stop duplicate registrations?**
Two layers. The service checks for an existing registration inside the transaction. The `Registrations` table also has a unique index on `(userId, eventId)`, so even buggy code couldn't insert a second row.

**How does check-in prevent using a pass twice?**
`checkinService.js`. It runs one `UPDATE ... SET status='checked_in' WHERE registrationId=? AND eventId=? AND status='registered'`. The database applies it atomically. If two volunteers scan at the same instant, only one update matches, and the other updates 0 rows, which I report as "already used".

**What is inside the QR code?**
Only the registration ID, like `EH-7K3F-9Q2A`, made with `crypto.randomInt`, so it can't be guessed. No name or email. The scanner sends the ID to the server, which looks everything up and shows the volunteer the name to compare with the ID card.

**How does login work?**
Passwords are hashed with bcrypt, which is slow on purpose and salted. On login the server compares the hash and returns a JWT signed with a secret only the server knows. The browser sends it in the `Authorization` header. The `requireAuth` middleware verifies it and loads the user; `requireRole('admin')` protects admin routes. Changing "student" to "admin" inside the token breaks its signature.

**What is middleware? Which ones do you have?**
A function that runs between the request arriving and the route answering, with `(req, res, next)`. In order, mine are:
- `cors`
- `express.json` (parses the body)
- `requestLogger` (method, URL, status, time)
- `requireAuth` / `requireRole` on the routes
- `notFound` and `errorHandler` at the end, which turns every thrown error into one JSON shape

**Where are callbacks and the event loop in your project?**
- `events/activity.js`: routes call `activity.emit('registered', ...)` and a listener appends to `activity.log` with `fs.appendFile(file, line, callback)`. The write runs in Node's thread pool; the callback runs later from the event loop. The registration response doesn't wait for the disk.
- The dashboard reads the file back with `fs.readFile(..., callback)`.
- `jobs/reminderJob.js` uses `setInterval` every minute; between ticks the server keeps serving requests.

**Client-side vs server-side validation: why both?**
Client-side gives instant feedback. Server-side is the real protection, because anyone can call the API directly with Postman and skip the browser. Both live in a `validators.js` with the same rules.

**What are props and state? Give an example from your code.**
Props are inputs passed in by the parent, read-only. `EventCard` receives `event`, `onRegister` and `registering`. State is data a component owns and changes with `useState`; changing it re-renders. `EventsPage` keeps `filters` and `registeringId` in state.

**Why do lists need keys?**
So React can match each item between renders. When the filtered list changes, `key={event.id}` tells React which card is which, instead of reusing the wrong DOM elements.

**What is a controlled component?**
An input whose value comes from React state (`value={filters.search}`) and changes only through `onChange`. React is the single source of truth.

**What does `useEffect` do in your app?**
It runs side effects after rendering: fetching data in `useApi`, the 5-second refresh on the gate page, the `keydown` listener, and starting the camera. Each returns a cleanup function: `clearInterval`, `removeEventListener`, stopping the camera.

**What is CORS and why do you need `cors()`?**
Browsers block a page from reading responses from a different origin (protocol + host + port) unless the server allows it. Locally the Vite proxy makes everything same-origin. When the frontend is on Vercel and the API elsewhere, `cors({ origin: CLIENT_ORIGIN })` allows exactly our frontend.

**What is an ORM / ODM?**
Sequelize maps tables to JavaScript models (ORM, for SQL). Mongoose maps MongoDB collections to schemas and models (ODM, for documents). I write `Event.findAll({ where })` or `EntryLog.find(filter)` instead of raw queries; the libraries also validate data and manage connections.

**Schema vs model in Mongoose?**
The schema describes the shape and rules (`entryLogSchema`: fields, enum, maxlength, index). The model (`mongoose.model('EntryLog', schema)`) is the class you query with: `create`, `find`, `findByIdAndUpdate`, `deleteMany`.

**What are the ACID properties, using your project?**
- **Atomicity:** if anything in the registration transaction fails, nothing is saved.
- **Consistency:** the unique index and foreign keys always hold.
- **Isolation:** the row lock makes concurrent registrations behave as if they ran one after another.
- **Durability:** once PostgreSQL commits, the pass survives a crash.

**What happens if MongoDB is down?**
Check-in still works, because the check-in itself is in PostgreSQL. Writing the log entry is wrapped in try/catch, and the dashboard shows "n/a" for rejected scans. I chose that because a broken log shouldn't stop students from entering.

## Things to say if asked what you would add next

- A waiting list when an event is full
- Email reminders instead of log lines
- Cancelling a registration, which frees the seat
- Tracking which volunteer runs which gate
- Rate limiting on login
