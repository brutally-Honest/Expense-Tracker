const CATEGORIES = ['', 'Food', 'Transport', 'Utilities', 'Shopping', 'Health', 'Entertainment', 'Other'];

/** Native select arrows ignore horizontal padding on WebKit; custom chevron + appearance-none fixes it. */
export const FILTER_SELECT_STYLE = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.75rem center',
  backgroundSize: '1rem 1rem',
};

export const filterSelectClassName =
  'border border-gray-300 rounded-md pl-4 pr-11 py-2 text-sm text-gray-900 bg-white cursor-pointer appearance-none focus:outline-none focus:ring-1 focus:ring-gray-400';

/**
 * FilterBar
 *
 * Pure UI — receives current filter values and calls onFilterChange.
 * No internal state. Think of it as a controlled input at the app level.
 */
export function FilterBar({ filters, onFilterChange }) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Category filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Filter by</label>
        <select
          value={filters.category}
          onChange={(e) => onFilterChange('category', e.target.value)}
          className={`${filterSelectClassName} min-w-[10.5rem]`}
          style={FILTER_SELECT_STYLE}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c || 'All categories'}
            </option>
          ))}
        </select>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-500">Sort</label>
        <select
          value={filters.sort}
          onChange={(e) => onFilterChange('sort', e.target.value)}
          className={`${filterSelectClassName} min-w-[9.5rem]`}
          style={FILTER_SELECT_STYLE}
        >
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
        </select>
      </div>
    </div>
  );
}
