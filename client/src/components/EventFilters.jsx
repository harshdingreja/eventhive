import Icon from './Icon.jsx';
import { CATEGORIES } from '../lib/validators.js';
import { DEFAULT_FILTERS, isFiltered } from '../lib/filters.js';

// A controlled form (Experiment 6): the parent owns the filter values and gets every
// change through onChange, so the list re-renders on each keystroke.
export default function EventFilters({ filters, onChange, counts, total }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div className="filters">
      <div className="filters__row">
        <label className="search">
          <Icon name="search" />
          <span className="sr-only">Search events</span>
          <input
            type="search"
            placeholder="Search by name, venue or club"
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
          />
        </label>

        <label className="select-inline">
          <span className="sr-only">When</span>
          <select value={filters.when} onChange={(e) => update('when', e.target.value)}>
            <option value="any">Any date</option>
            <option value="today">Today</option>
            <option value="week">Next 7 days</option>
            <option value="month">Next 30 days</option>
          </select>
        </label>

        <label className="select-inline">
          <span className="sr-only">Availability</span>
          <select value={filters.availability} onChange={(e) => update('availability', e.target.value)}>
            <option value="all">All events</option>
            <option value="open">Seats available</option>
            <option value="mine">Registered by me</option>
          </select>
        </label>
      </div>

      <div className="chips" role="group" aria-label="Category">
        {['All', ...CATEGORIES].map((category) => {
          const count = category === 'All' ? total : counts[category] || 0;
          return (
            <button
              key={category}
              type="button"
              className="chip"
              data-category={category}
              aria-pressed={filters.category === category}
              onClick={() => update('category', category)}
              disabled={count === 0 && category !== 'All'}
            >
              {category}
              <span className="chip__count">{count}</span>
            </button>
          );
        })}
        {isFiltered(filters) && (
          <button type="button" className="link-button" onClick={() => onChange(DEFAULT_FILTERS)}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
