// Experiment 3: array methods. The events page keeps the full list from the API and
// derives what to show with filter() / reduce(), so typing in search feels instant.
import { daysUntil } from './format.js';

export const DEFAULT_FILTERS = { search: '', category: 'All', when: 'any', availability: 'all' };

const WHEN_LIMITS = { today: 0, week: 7, month: 30 };

export function filterEvents(events, { search, category, when, availability }) {
  const query = search.trim().toLowerCase();

  return events.filter((event) => {
    if (category !== 'All' && event.category !== category) return false;

    if (when !== 'any' && daysUntil(event.date) > WHEN_LIMITS[when]) return false;

    if (availability === 'open' && (event.seatsLeft === 0 || event.hasStarted)) return false;
    if (availability === 'mine' && !event.myRegistrationId) return false;

    if (query) {
      const searchable = [event.title, event.description, event.venue, event.organizer].join(' ').toLowerCase();
      if (!searchable.includes(query)) return false;
    }
    return true;
  });
}

export function isFiltered(filters) {
  return Object.keys(DEFAULT_FILTERS).some((key) => filters[key] !== DEFAULT_FILTERS[key]);
}

// { Technical: 3, Cultural: 1, ... }
export function countByCategory(events) {
  return events.reduce((counts, event) => {
    counts[event.category] = (counts[event.category] || 0) + 1;
    return counts;
  }, {});
}

// Passes whose event has not started yet, and the rest.
export function splitPasses(passes) {
  return {
    upcoming: passes.filter((p) => !p.event.hasStarted),
    past: passes.filter((p) => p.event.hasStarted),
  };
}
