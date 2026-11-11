'use client';

import React from 'react';
import { Search, MapPin, Filter, X } from 'lucide-react';
import { EVENT_CATEGORIES, SORT_OPTIONS } from '../../constants/categories.js';

export function EventFilters({ filters, onFilterChange, onReset }) {
  const hasActiveFilters =
    Boolean(filters.search) ||
    (Boolean(filters.category) && filters.category !== 'All') ||
    Boolean(filters.city) ||
    Boolean(filters.activityType);

  return (
    <div className="bg-white border border-surface-200 rounded-2xl p-5 mb-8 shadow-sm space-y-4">
      {/* Top Search & City Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Search */}
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-surface-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search activities by title (e.g. 5K Sunrise Run)..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
          />
        </div>

        {/* City Filter */}
        <div className="md:col-span-3 relative">
          <MapPin className="w-4 h-4 text-surface-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by city..."
            value={filters.city || ''}
            onChange={(e) => onFilterChange('city', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 transition-colors"
          />
        </div>

        {/* Sort Select */}
        <div className="md:col-span-3">
          <select
            value={`${filters.sortBy || 'startDateTime'}_${filters.sortOrder || 'asc'}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('_');
              onFilterChange('sortBy', sortBy);
              onFilterChange('sortOrder', sortOrder);
            }}
            className="w-full px-3.5 py-2.5 text-sm bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-surface-800 transition-colors"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Pills Row */}
      <div className="pt-2 border-t border-surface-100 flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-surface-400 mr-1 flex items-center">
          <Filter className="w-3.5 h-3.5 mr-1" />
          Categories:
        </span>
        {EVENT_CATEGORIES.map((cat) => {
          const isSelected =
            filters.category === cat || (!filters.category && cat === 'All');
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onFilterChange('category', cat === 'All' ? '' : cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-surface-100 text-surface-700 hover:bg-surface-200'
              }`}
            >
              {cat}
            </button>
          );
        })}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="ml-auto inline-flex items-center text-xs font-semibold text-surface-500 hover:text-red-600 transition-colors pl-2"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Reset Filters
          </button>
        )}
      </div>
    </div>
  );
}

export default EventFilters;
