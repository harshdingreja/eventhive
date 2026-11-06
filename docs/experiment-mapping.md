# Where each lab experiment lives in EventHive

Use this during the evaluation: for each experiment, open the file and show the feature.

| # | Experiment | Where in EventHive | Files to open | Show in the demo |
|---|---|---|---|---|
| 1 | HTML page: head, body, links, formatting, image, table, lists, audio, video | The About COG page, plain HTML with no React | `client/public/about.html` | Footer link "About COG and EventHive": bookmark nav, table with caption/thead/tfoot, ordered + unordered + description lists, image, video, audio, mailto/external/internal links |
| 2 | Web form styled with CSS3 selectors, pseudo-classes, pseudo-elements | Every form in the app (login, signup, event form, gate) | `client/src/styles/forms.css` (each rule is commented with the feature it shows); also `components.css` (`[data-category]`, `[aria-pressed]`, `::before` badge dot, `attr()` table labels), `pass.css` (`::before` perforation) | Submit the login form empty: red borders from `[aria-invalid]`, "!" from `::before`, "*" from `::after`; focus a field for `:focus` / `:focus-within` |
| 3 | JS functions, objects, arrays, strings | Event search and filters, date/time formatting, dashboard totals | `client/src/lib/filters.js` (`filter`, `reduce`, `includes`), `client/src/lib/format.js` (`split`, `padStart`, `toUpperCase`, `slice`), `server/src/routes/stats.js` (`reduce`) | Type in the event search and click category chips: instant filtering in the browser |
| 4a | Events, classes, error handling | `ApiClient` and `ApiError` classes; try/catch around every API call; keyboard shortcut | `client/src/lib/api.js`, `server/src/utils/AppError.js`, `client/src/pages/CheckInPage.jsx` (`addEventListener('keydown')`) | Stop the API server and reload: the friendly "Cannot reach the server" message comes from the catch block. On the gate page press `/` |
| 4b | Input validation | Signup, login and event form, checked in the browser **and** again on the server | `client/src/lib/validators.js`, `server/src/utils/validators.js` | Signup with a short password, mismatched confirmation, or a bad email |
| 5 | React + Vite setup | The whole `client/` app; production build | `client/vite.config.js`, `client/package.json`, `client/src/main.jsx` | `npm run build` produces `client/dist` |
| 6 | JSX, components, props, state, forms, events, keys | All pages and components | `components/EventCard.jsx` (props), `pages/EventsPage.jsx` (useState, list `key`), `components/EventFilters.jsx` (controlled inputs), `pages/EventFormPage.jsx` (form state) | Register for an event; filter the list |
| 7 | Node.js setup | The API is a Node project with npm scripts | `server/package.json` (`dev`, `start`, `seed`, `test`) | `npm run dev` in `server/` |
| 8 | Callbacks and the event loop | EventEmitter + `fs.appendFile` / `fs.readFile` callbacks; `setInterval` reminder job | `server/src/events/activity.js`, `server/src/jobs/reminderJob.js` | Register or check in, then show "Recent server activity" on the dashboard and `server/logs/activity.log`. The terminal prints `[reminder] ... starts in N min` |
| 9 | Express: routing, middleware, req/res | The REST API | `server/src/app.js` (middleware order), `server/src/routes/*.js`, `server/src/middleware/*.js` | Terminal shows the request logger line for every request; open `/api/health` |
| 10 | PostgreSQL + Sequelize CRUD | Users, events, registrations with associations, a transaction and a row lock | `server/src/models/*.js`, `server/src/services/registrationService.js`, `server/src/routes/events.js` | Admin creates, edits and deletes an event; `psql eventhive -c 'SELECT * FROM "Events";'` |
| 11 | MongoDB + Mongoose CRUD | Gate log: create on every scan, read with filters, update a note, delete one or all | `server/src/models/EntryLog.js`, `server/src/routes/entryLogs.js`, `server/src/services/checkinService.js` | Scan the same pass twice, add a note to the log entry, delete it; `mongosh eventhive --eval 'db.entrylogs.find()'` |
| 12 | REST API consumed by React | Every page loads data from the Express API with `fetch` | `client/src/lib/api.js`, `client/src/hooks/useApi.js`, `server/src/app.js` (`cors`) | Browser DevTools, Network tab: `/api/events` returning JSON |
| 13 | Deploy to Vercel | Static build of `client/`, with SPA rewrites; deployed straight from the GitHub repo | `vercel.json` (build settings and rewrites), README "Deploying" | Open the Vercel link: the About page and the login screen load. Explain that the API and databases run on the laptop, so login there says "Cannot reach the EventHive server" |

## Extras worth mentioning (beyond the manual)

- **Concurrency safety**, proven by tests. Four students racing for two seats always gives exactly two passes. Two volunteers scanning one pass at the same instant gives exactly one check-in (`server/test/api.test.js`). Removing the row lock makes the first test fail.
- **Security.** bcrypt password hashes, JWT auth, role checks on the server, and a QR code holding only a random ID.
- **Code splitting.** The camera library loads only when an admin turns the camera on (`React.lazy`).
- **Responsive.** Every page works on a phone, and tables turn into labelled cards using `::before { content: attr(data-label) }`.
