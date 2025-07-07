# Date Helpers Guide

## Overview
The Date Helpers utilities in typesense-react provide convenient functions for creating date-based filters. These utilities handle timestamp conversion, date ranges, presets, and common date filtering patterns.

## Table of Contents
1. [Basic Date Filtering](#basic-date-filtering)
2. [Date Range Filters](#date-range-filters)
3. [Relative Date Filters](#relative-date-filters)
4. [Date Presets](#date-presets)
5. [Month and Year Filters](#month-and-year-filters)
6. [Date Filter Parsing](#date-filter-parsing)
7. [UI Integration Examples](#ui-integration-examples)
8. [Advanced Date Filtering](#advanced-date-filtering)
9. [Best Practices](#best-practices)

## Basic Date Filtering

### Creating Date Range Filters

```typescript
import { getDateRangeFilter } from '@/utils/dateFilterHelpers';

// Basic date range
const rangeFilter = getDateRangeFilter(
  'created_at',
  new Date('2024-01-01'),
  new Date('2024-12-31')
);
// Result: "created_at:[1704067200..1735689599]"

// Dates are automatically swapped if end is before start
const swappedFilter = getDateRangeFilter(
  'created_at',
  new Date('2024-12-31'), // End date first
  new Date('2024-01-01')  // Start date second
);
// Result: "created_at:[1704067200..1735689599]" (same as above)

// Using Date objects with time
const preciseFilter = getDateRangeFilter(
  'published_at',
  new Date('2024-01-01T09:00:00'),
  new Date('2024-01-01T17:00:00')
);
// Converts to Unix timestamps preserving time
```

### After/Before Date Filters

```typescript
import { getAfterDateFilter, getBeforeDateFilter } from '@/utils/dateFilterHelpers';

// Filter for dates after a specific date
const afterFilter = getAfterDateFilter('created_at', new Date('2024-01-01'));
// Result: "created_at:>1704067200"

// Filter for dates before a specific date
const beforeFilter = getBeforeDateFilter('updated_at', new Date('2024-12-31'));
// Result: "updated_at:<1735689599"

// Combining after and before for custom ranges
const customRange = combineFilters([
  getAfterDateFilter('created_at', new Date('2024-01-01')),
  getBeforeDateFilter('created_at', new Date('2024-12-31'))
]);
// Result: "created_at:>1704067200 && created_at:<1735689599"
```

## Date Range Filters

### Last N Days Filter

```typescript
import { getLastNDaysFilter } from '@/utils/dateFilterHelpers';

// Last 7 days (including today)
const last7Days = getLastNDaysFilter('created_at', 7);
// Result: "created_at:[1234567890..1234654290]"

// Last 30 days
const last30Days = getLastNDaysFilter('updated_at', 30);

// Last 1 day (today only)
const today = getLastNDaysFilter('created_at', 1);

// How it works:
// - End time is set to 23:59:59.999 UTC today
// - Start time is N-1 days back at 00:00:00.000 UTC
// - This includes exactly N days including today
```

### Last N Months Filter

```typescript
import { getLastNMonthsFilter } from '@/utils/dateFilterHelpers';

// Last 3 months
const last3Months = getLastNMonthsFilter('created_at', 3);

// Last 12 months (1 year)
const lastYear = getLastNMonthsFilter('created_at', 12);

// Note: This uses calendar months, not 30-day periods
// If today is June 15, last 3 months starts from March 15
```

## Relative Date Filters

### Dynamic Date Ranges

```typescript
// Build a dynamic "recent items" filter
function getRecentItemsFilter(field: string, days: number = 7) {
  return getLastNDaysFilter(field, days);
}

// Build a "new this week" filter
function getThisWeekFilter(field: string) {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const startOfWeek = new Date(now);
  startOfWeek.setUTCDate(now.getUTCDate() - dayOfWeek);
  startOfWeek.setUTCHours(0, 0, 0, 0);
  
  return getDateRangeFilter(field, startOfWeek, now);
}

// Build a "last business week" filter
function getLastBusinessWeekFilter(field: string) {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  
  // Last Monday
  const lastMonday = new Date(now);
  lastMonday.setUTCDate(now.getUTCDate() - dayOfWeek - 6);
  lastMonday.setUTCHours(0, 0, 0, 0);
  
  // Last Friday
  const lastFriday = new Date(lastMonday);
  lastFriday.setUTCDate(lastMonday.getUTCDate() + 4);
  lastFriday.setUTCHours(23, 59, 59, 999);
  
  return getDateRangeFilter(field, lastMonday, lastFriday);
}
```

### Rolling Window Filters

```typescript
// Create a rolling 24-hour window
function getRolling24HoursFilter(field: string) {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return getDateRangeFilter(field, yesterday, now);
}

// Create a rolling 7-day window (exactly 168 hours)
function getRolling7DaysFilter(field: string) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return getDateRangeFilter(field, weekAgo, now);
}

// Compare with calendar-based last 7 days
const calendarBased = getLastNDaysFilter('created_at', 7);
const rollingWindow = getRolling7DaysFilter('created_at');
// These may produce different results!
```

## Date Presets

### Using Built-in Presets

```typescript
import { applyDatePreset, DateRangePresets } from '@/utils/dateFilterHelpers';

// Today only
const todayFilter = applyDatePreset('created_at', 'TODAY');
// Filters from 00:00:00 to 23:59:59 UTC today

// Yesterday only
const yesterdayFilter = applyDatePreset('updated_at', 'YESTERDAY');
// Filters for all of yesterday UTC

// Last 7 days
const week = applyDatePreset('modified_at', 'LAST_7_DAYS');
// Includes today and 6 previous days

// This month
const thisMonth = applyDatePreset('published_at', 'THIS_MONTH');
// From first day to last day of current month

// Last month
const lastMonth = applyDatePreset('created_at', 'LAST_MONTH');
// All days in the previous calendar month

// This year
const thisYear = applyDatePreset('created_at', 'THIS_YEAR');
// January 1 to December 31 of current year

// Last year
const lastYear = applyDatePreset('created_at', 'LAST_YEAR');
// All of previous calendar year
```

### Date Preset Selector Component

```typescript
function DatePresetSelector({ 
  field,
  onFilterChange 
}: { 
  field: string;
  onFilterChange: (filter: string) => void;
}) {
  const presets = [
    { value: 'TODAY', label: 'Today' },
    { value: 'YESTERDAY', label: 'Yesterday' },
    { value: 'LAST_7_DAYS', label: 'Last 7 Days' },
    { value: 'LAST_30_DAYS', label: 'Last 30 Days' },
    { value: 'THIS_MONTH', label: 'This Month' },
    { value: 'LAST_MONTH', label: 'Last Month' },
    { value: 'THIS_YEAR', label: 'This Year' },
    { value: 'LAST_YEAR', label: 'Last Year' }
  ];
  
  const handlePresetChange = (preset: DateRangePreset) => {
    const filter = applyDatePreset(field, preset);
    onFilterChange(filter);
  };
  
  return (
    <div className="date-presets">
      {presets.map(preset => (
        <button
          key={preset.value}
          onClick={() => handlePresetChange(preset.value as DateRangePreset)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
```

## Month and Year Filters

### Current Period Filters

```typescript
import { getCurrentMonthFilter, getCurrentYearFilter } from '@/utils/dateFilterHelpers';

// Filter for current month
const currentMonth = getCurrentMonthFilter('created_at');
// If today is June 15, 2024:
// Result: "created_at:[1717200000..1719791999]" (June 1-30, 2024)

// Filter for current year
const currentYear = getCurrentYearFilter('published_at');
// Result: "published_at:[1704067200..1735689599]" (Jan 1 - Dec 31, 2024)
```

### Specific Month/Year Filters

```typescript
import { getMonthFilter } from '@/utils/dateFilterHelpers';

// Filter for specific month
const june2024 = getMonthFilter('created_at', 2024, 5); // Month is 0-indexed
// Result: "created_at:[1717200000..1719791999]"

// Filter for December 2023
const december2023 = getMonthFilter('created_at', 2023, 11);

// Build a month selector
function MonthYearSelector() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const applyFilter = () => {
    const filter = getMonthFilter('created_at', year, month);
    // Apply filter to search
  };
  
  return (
    <div>
      <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
        {months.map((name, index) => (
          <option key={index} value={index}>{name}</option>
        ))}
      </select>
      <input
        type="number"
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        min="2000"
        max="2099"
      />
      <button onClick={applyFilter}>Apply</button>
    </div>
  );
}
```

### Quarter Filters

```typescript
// Build quarter filters using month ranges
function getQuarterFilter(field: string, year: number, quarter: 1 | 2 | 3 | 4) {
  const quarterMonths = {
    1: [0, 2],   // Jan-Mar
    2: [3, 5],   // Apr-Jun
    3: [6, 8],   // Jul-Sep
    4: [9, 11]   // Oct-Dec
  };
  
  const [startMonth, endMonth] = quarterMonths[quarter];
  
  const start = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, endMonth + 1, 0, 23, 59, 59, 999));
  
  return getDateRangeFilter(field, start, end);
}

// Usage
const q1_2024 = getQuarterFilter('revenue_date', 2024, 1);
const q4_2023 = getQuarterFilter('revenue_date', 2023, 4);
```

## Date Filter Parsing

### Parsing Date Range Filters

```typescript
import { parseDateRangeFilter, parseDateRangeFromFilter } from '@/utils/dateFilterHelpers';

// Parse a complete date range filter
const filterString = 'created_at:[1704067200..1735689599]';
const parsed = parseDateRangeFilter(filterString);
// Result: {
//   field: 'created_at',
//   startDate: Date('2024-01-01'),
//   endDate: Date('2024-12-31')
// }

// Parse from a complex filter string
const complexFilter = 'category:=electronics && created_at:[1704067200..1735689599] && price:>100';
const dateRange = parseDateRangeFromFilter(complexFilter, 'created_at');
// Result: {
//   start: Date('2024-01-01'),
//   end: Date('2024-12-31')
// }

// Handle millisecond timestamps
const msFilter = 'updated_at:[1704067200000..1735689599000]';
const msParsed = parseDateRangeFilter(msFilter);
// Automatically detects and converts milliseconds to seconds
```

### Extracting Date Information

```typescript
// Build a date filter analyzer
function analyzeDateFilter(filterString: string) {
  const dateFields = ['created_at', 'updated_at', 'published_at'];
  const analysis = {
    hasDateFilter: false,
    dateRanges: [] as Array<{
      field: string;
      start: Date;
      end: Date;
      daysSpan: number;
    }>
  };
  
  for (const field of dateFields) {
    const range = parseDateRangeFromFilter(filterString, field);
    if (range) {
      analysis.hasDateFilter = true;
      const daysSpan = Math.ceil(
        (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)
      );
      analysis.dateRanges.push({
        field,
        start: range.start,
        end: range.end,
        daysSpan
      });
    }
  }
  
  return analysis;
}

// Usage
const analysis = analyzeDateFilter('created_at:[1704067200..1735689599] && category:=books');
// Result: {
//   hasDateFilter: true,
//   dateRanges: [{
//     field: 'created_at',
//     start: Date('2024-01-01'),
//     end: Date('2024-12-31'),
//     daysSpan: 366
//   }]
// }
```

## UI Integration Examples

### Date Range Picker Component

```typescript
function DateRangePicker({ 
  field,
  onApply 
}: { 
  field: string;
  onApply: (filter: string) => void;
}) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [preset, setPreset] = useState<string>('');
  
  const handlePresetChange = (value: string) => {
    setPreset(value);
    if (value && value !== 'custom') {
      const filter = applyDatePreset(field, value as DateRangePreset);
      onApply(filter);
      // Clear custom dates
      setStartDate(null);
      setEndDate(null);
    }
  };
  
  const handleCustomApply = () => {
    if (startDate || endDate) {
      const filter = getDateRangeFilter(
        field,
        startDate || new Date(0),
        endDate || new Date()
      );
      onApply(filter);
    }
  };
  
  return (
    <div className="date-range-picker">
      <select value={preset} onChange={(e) => handlePresetChange(e.target.value)}>
        <option value="">Select period...</option>
        <option value="TODAY">Today</option>
        <option value="YESTERDAY">Yesterday</option>
        <option value="LAST_7_DAYS">Last 7 Days</option>
        <option value="LAST_30_DAYS">Last 30 Days</option>
        <option value="THIS_MONTH">This Month</option>
        <option value="LAST_MONTH">Last Month</option>
        <option value="custom">Custom Range...</option>
      </select>
      
      {preset === 'custom' && (
        <div className="custom-range">
          <DatePicker
            selected={startDate}
            onChange={setStartDate}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            placeholderText="Start date"
          />
          <DatePicker
            selected={endDate}
            onChange={setEndDate}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            placeholderText="End date"
          />
          <button onClick={handleCustomApply}>Apply</button>
        </div>
      )}
    </div>
  );
}
```

### Activity Timeline Filter

```typescript
function ActivityTimelineFilter() {
  const [activeFilter, setActiveFilter] = useState('LAST_7_DAYS');
  
  const timelineOptions = [
    { value: 'TODAY', label: 'Today', icon: '📅' },
    { value: 'YESTERDAY', label: 'Yesterday', icon: '📆' },
    { value: 'LAST_7_DAYS', label: 'This Week', icon: '📊' },
    { value: 'LAST_30_DAYS', label: 'This Month', icon: '📈' },
    { value: 'THIS_YEAR', label: 'This Year', icon: '🗓️' }
  ];
  
  const { search } = useSearch();
  
  const applyTimelineFilter = (preset: string) => {
    setActiveFilter(preset);
    const filter = applyDatePreset('activity_date', preset as DateRangePreset);
    
    search({
      filter_by: filter,
      // Other search params
    });
  };
  
  return (
    <div className="timeline-filter">
      {timelineOptions.map(option => (
        <button
          key={option.value}
          className={`timeline-btn ${activeFilter === option.value ? 'active' : ''}`}
          onClick={() => applyTimelineFilter(option.value)}
        >
          <span className="icon">{option.icon}</span>
          <span className="label">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
```

### Analytics Date Selector

```typescript
function AnalyticsDateSelector() {
  const [dateMode, setDateMode] = useState<'preset' | 'comparison'>('preset');
  const [primaryRange, setPrimaryRange] = useState('LAST_30_DAYS');
  const [comparisonRange, setComparisonRange] = useState('PREVIOUS_PERIOD');
  
  const getPreviousPeriod = (preset: string): string => {
    switch (preset) {
      case 'LAST_7_DAYS':
        // Get 7 days before the last 7 days
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return getDateRangeFilter('analytics_date', twoWeeksAgo, oneWeekAgo);
        
      case 'LAST_30_DAYS':
        // Get 30 days before the last 30 days
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return getDateRangeFilter('analytics_date', sixtyDaysAgo, thirtyDaysAgo);
        
      default:
        return '';
    }
  };
  
  const getComparisonFilters = () => {
    const primary = applyDatePreset('analytics_date', primaryRange as DateRangePreset);
    const comparison = comparisonRange === 'PREVIOUS_PERIOD' 
      ? getPreviousPeriod(primaryRange)
      : applyDatePreset('analytics_date', comparisonRange as DateRangePreset);
    
    return { primary, comparison };
  };
  
  return (
    <div className="analytics-date-selector">
      <div className="mode-selector">
        <button 
          className={dateMode === 'preset' ? 'active' : ''}
          onClick={() => setDateMode('preset')}
        >
          Single Period
        </button>
        <button 
          className={dateMode === 'comparison' ? 'active' : ''}
          onClick={() => setDateMode('comparison')}
        >
          Compare Periods
        </button>
      </div>
      
      {dateMode === 'preset' ? (
        <select 
          value={primaryRange} 
          onChange={(e) => setPrimaryRange(e.target.value)}
        >
          <option value="LAST_7_DAYS">Last 7 days</option>
          <option value="LAST_30_DAYS">Last 30 days</option>
          <option value="THIS_MONTH">This month</option>
          <option value="LAST_MONTH">Last month</option>
        </select>
      ) : (
        <div className="comparison-selectors">
          <div>
            <label>Primary Period:</label>
            <select 
              value={primaryRange} 
              onChange={(e) => setPrimaryRange(e.target.value)}
            >
              <option value="LAST_7_DAYS">Last 7 days</option>
              <option value="LAST_30_DAYS">Last 30 days</option>
            </select>
          </div>
          <div>
            <label>Compare to:</label>
            <select 
              value={comparisonRange} 
              onChange={(e) => setComparisonRange(e.target.value)}
            >
              <option value="PREVIOUS_PERIOD">Previous period</option>
              <option value="LAST_YEAR">Same period last year</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Advanced Date Filtering

### Compound Date Filters

```typescript
// Filter for items created this year but updated recently
function getStaleItemsFilter() {
  const filters = [
    getCurrentYearFilter('created_at'),
    getLastNDaysFilter('updated_at', 30)
  ];
  return combineFilters(filters);
}

// Filter for seasonal items
function getSeasonalFilter(season: 'spring' | 'summer' | 'fall' | 'winter') {
  const year = new Date().getFullYear();
  const seasonRanges = {
    spring: { start: new Date(year, 2, 20), end: new Date(year, 5, 20) },
    summer: { start: new Date(year, 5, 21), end: new Date(year, 8, 21) },
    fall: { start: new Date(year, 8, 22), end: new Date(year, 11, 20) },
    winter: { start: new Date(year, 11, 21), end: new Date(year + 1, 2, 19) }
  };
  
  const range = seasonRanges[season];
  return getDateRangeFilter('season_date', range.start, range.end);
}
```

### Business Hours Filter

```typescript
// Filter for items created during business hours
function getBusinessHoursFilter(field: string, date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(9, 0, 0, 0); // 9 AM
  
  const endOfDay = new Date(date);
  endOfDay.setHours(17, 0, 0, 0); // 5 PM
  
  return getDateRangeFilter(field, startOfDay, endOfDay);
}

// Filter for weekday items only
function getWeekdaysFilter(field: string, startDate: Date, endDate: Date) {
  const filters: string[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // Monday = 1, Friday = 5
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      filters.push(getDateRangeFilter(
        field,
        new Date(current.setHours(0, 0, 0, 0)),
        new Date(current.setHours(23, 59, 59, 999))
      ));
    }
    current.setDate(current.getDate() + 1);
  }
  
  return combineFilters(filters, ' || ');
}
```

### Fiscal Period Filters

```typescript
// Fiscal year starting in April
function getFiscalYearFilter(field: string, fiscalYear: number) {
  const start = new Date(fiscalYear - 1, 3, 1); // April 1
  const end = new Date(fiscalYear, 2, 31, 23, 59, 59); // March 31
  
  return getDateRangeFilter(field, start, end);
}

// Fiscal quarter
function getFiscalQuarterFilter(
  field: string, 
  fiscalYear: number, 
  quarter: 1 | 2 | 3 | 4
) {
  const quarterRanges = {
    1: { startMonth: 3, endMonth: 5 },   // Apr-Jun
    2: { startMonth: 6, endMonth: 8 },   // Jul-Sep
    3: { startMonth: 9, endMonth: 11 },  // Oct-Dec
    4: { startMonth: 0, endMonth: 2 }    // Jan-Mar (next calendar year)
  };
  
  const { startMonth, endMonth } = quarterRanges[quarter];
  const yearAdjustment = quarter === 4 ? 1 : 0;
  
  const start = new Date(fiscalYear - 1 + yearAdjustment, startMonth, 1);
  const end = new Date(fiscalYear - 1 + yearAdjustment, endMonth + 1, 0, 23, 59, 59);
  
  return getDateRangeFilter(field, start, end);
}
```

## Best Practices

### 1. Use UTC for Consistency

```typescript
// Always work with UTC to avoid timezone issues
function getTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0
  ));
}

// Create timezone-aware filters
function getLocalDayFilter(field: string, timezoneOffset: number) {
  const localNow = new Date();
  const utcNow = new Date(localNow.getTime() - timezoneOffset * 60 * 1000);
  
  const startOfLocalDay = new Date(utcNow);
  startOfLocalDay.setHours(0, 0, 0, 0);
  
  const endOfLocalDay = new Date(utcNow);
  endOfLocalDay.setHours(23, 59, 59, 999);
  
  return getDateRangeFilter(field, startOfLocalDay, endOfLocalDay);
}
```

### 2. Handle Invalid Dates

```typescript
function safeDateFilter(field: string, startInput: any, endInput: any) {
  let start: Date | undefined;
  let end: Date | undefined;
  
  // Validate start date
  if (startInput) {
    const startDate = new Date(startInput);
    if (!isNaN(startDate.getTime())) {
      start = startDate;
    }
  }
  
  // Validate end date
  if (endInput) {
    const endDate = new Date(endInput);
    if (!isNaN(endDate.getTime())) {
      end = endDate;
    }
  }
  
  // Only create filter if at least one date is valid
  if (start || end) {
    return getDateRangeFilter(field, start, end);
  }
  
  return '';
}
```

### 3. Cache Date Calculations

```typescript
const useDateFilterCache = () => {
  const cache = useRef(new Map<string, string>());
  
  const getCachedFilter = (key: string, generator: () => string) => {
    if (cache.current.has(key)) {
      return cache.current.get(key)!;
    }
    
    const filter = generator();
    cache.current.set(key, filter);
    return filter;
  };
  
  // Clear cache at midnight
  useEffect(() => {
    const clearCache = () => cache.current.clear();
    
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeout = setTimeout(clearCache, tomorrow.getTime() - now.getTime());
    
    return () => clearTimeout(timeout);
  }, []);
  
  return getCachedFilter;
};
```

### 4. Provide Clear Date Labels

```typescript
function getDateRangeLabel(filterString: string): string {
  const parsed = parseDateRangeFilter(filterString);
  if (!parsed) return 'Custom date range';
  
  const { startDate, endDate } = parsed;
  const daysDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Check for common patterns
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (daysDiff === 1) {
    if (startDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (startDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
  }
  
  if (daysDiff === 7 && endDate.toDateString() === today.toDateString()) {
    return 'Last 7 days';
  }
  
  if (daysDiff === 30 && endDate.toDateString() === today.toDateString()) {
    return 'Last 30 days';
  }
  
  // Format custom range
  const formatDate = (date: Date) => 
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}
```

### 5. Combine with Other Filters

```typescript
function buildComplexDateQuery(params: {
  dateField: string;
  datePreset?: DateRangePreset;
  customStartDate?: Date;
  customEndDate?: Date;
  additionalFilters?: string[];
}) {
  const filters: string[] = [];
  
  // Add date filter
  if (params.datePreset) {
    filters.push(applyDatePreset(params.dateField, params.datePreset));
  } else if (params.customStartDate || params.customEndDate) {
    filters.push(getDateRangeFilter(
      params.dateField,
      params.customStartDate,
      params.customEndDate
    ));
  }
  
  // Add other filters
  if (params.additionalFilters) {
    filters.push(...params.additionalFilters);
  }
  
  return combineFilters(filters);
}
```

## Complete Example: Advanced Date Filter Component

```typescript
function AdvancedDateFilter() {
  const [mode, setMode] = useState<'preset' | 'custom' | 'relative'>('preset');
  const [preset, setPreset] = useState('LAST_7_DAYS');
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [relativeDays, setRelativeDays] = useState(7);
  const [field] = useState('created_at');
  
  const getActiveFilter = (): string => {
    switch (mode) {
      case 'preset':
        return applyDatePreset(field, preset as DateRangePreset);
      
      case 'custom':
        if (customStart || customEnd) {
          return getDateRangeFilter(field, customStart, customEnd);
        }
        return '';
      
      case 'relative':
        return getLastNDaysFilter(field, relativeDays);
      
      default:
        return '';
    }
  };
  
  const getFilterDescription = (): string => {
    const filter = getActiveFilter();
    if (!filter) return 'No date filter';
    
    switch (mode) {
      case 'preset':
        const presetLabels: Record<string, string> = {
          TODAY: 'Today',
          YESTERDAY: 'Yesterday',
          LAST_7_DAYS: 'Last 7 days',
          LAST_30_DAYS: 'Last 30 days',
          THIS_MONTH: 'This month',
          LAST_MONTH: 'Last month',
          THIS_YEAR: 'This year',
          LAST_YEAR: 'Last year'
        };
        return presetLabels[preset] || preset;
      
      case 'custom':
        if (customStart && customEnd) {
          return `${customStart.toLocaleDateString()} - ${customEnd.toLocaleDateString()}`;
        } else if (customStart) {
          return `After ${customStart.toLocaleDateString()}`;
        } else if (customEnd) {
          return `Before ${customEnd.toLocaleDateString()}`;
        }
        return 'Custom range';
      
      case 'relative':
        return `Last ${relativeDays} days`;
      
      default:
        return '';
    }
  };
  
  return (
    <div className="advanced-date-filter">
      <div className="filter-modes">
        <button 
          className={mode === 'preset' ? 'active' : ''}
          onClick={() => setMode('preset')}
        >
          Presets
        </button>
        <button 
          className={mode === 'custom' ? 'active' : ''}
          onClick={() => setMode('custom')}
        >
          Custom Range
        </button>
        <button 
          className={mode === 'relative' ? 'active' : ''}
          onClick={() => setMode('relative')}
        >
          Relative
        </button>
      </div>
      
      <div className="filter-controls">
        {mode === 'preset' && (
          <select value={preset} onChange={(e) => setPreset(e.target.value)}>
            <option value="TODAY">Today</option>
            <option value="YESTERDAY">Yesterday</option>
            <option value="LAST_7_DAYS">Last 7 days</option>
            <option value="LAST_30_DAYS">Last 30 days</option>
            <option value="THIS_MONTH">This month</option>
            <option value="LAST_MONTH">Last month</option>
            <option value="THIS_YEAR">This year</option>
            <option value="LAST_YEAR">Last year</option>
          </select>
        )}
        
        {mode === 'custom' && (
          <div className="custom-inputs">
            <DatePicker
              selected={customStart}
              onChange={setCustomStart}
              placeholderText="Start date"
              isClearable
            />
            <DatePicker
              selected={customEnd}
              onChange={setCustomEnd}
              placeholderText="End date"
              minDate={customStart}
              isClearable
            />
          </div>
        )}
        
        {mode === 'relative' && (
          <div className="relative-input">
            <span>Last</span>
            <input
              type="number"
              value={relativeDays}
              onChange={(e) => setRelativeDays(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              max="365"
            />
            <span>days</span>
          </div>
        )}
      </div>
      
      <div className="filter-summary">
        <p>Active filter: <strong>{getFilterDescription()}</strong></p>
        <code>{getActiveFilter()}</code>
      </div>
    </div>
  );
}
```

This guide provides comprehensive examples of using the date helper utilities to create flexible, user-friendly date filtering in your Typesense-powered applications.