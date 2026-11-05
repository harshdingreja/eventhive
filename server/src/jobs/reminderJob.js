const { Op } = require('sequelize');
const { Event, Registration } = require('../models');
const { activity } = require('../events/activity');
const { localDateString, addDays, eventStart } = require('../utils/dates');

// Experiment 8: timers and the event loop.
//
// setInterval asks the event loop to run `tick` again every minute. Between ticks
// the server is free to answer requests; the timer does not block anything.
// Each tick finds events starting within the next hour and logs a reminder once.
// (A real product would email students here; the logging shows the same mechanism.)
function startReminderJob({ intervalMs = 60_000 } = {}) {
  const reminded = new Set(); // ids of events already reminded since the server started

  async function tick() {
    try {
      const now = new Date();
      const events = await Event.findAll({
        where: { date: { [Op.in]: [localDateString(now), localDateString(addDays(now, 1))] } },
      });

      for (const event of events) {
        const minutesLeft = Math.round((eventStart(event) - now) / 60_000);
        if (minutesLeft > 0 && minutesLeft <= 60 && !reminded.has(event.id)) {
          reminded.add(event.id);
          const notCheckedIn = await Registration.count({
            where: { eventId: event.id, status: 'registered' },
          });
          console.log(`[reminder] "${event.title}" starts in ${minutesLeft} min (${notCheckedIn} registered)`);
          activity.emit('reminder', { event, minutesLeft, notCheckedIn });
        }
      }
    } catch (err) {
      console.error('[reminder] failed:', err.message);
    }
  }

  const timer = setInterval(tick, intervalMs);
  timer.unref(); // this timer alone should not keep Node running
  setTimeout(tick, 0); // first check right away, after startup code has finished
  return () => clearInterval(timer);
}

module.exports = { startReminderJob };
