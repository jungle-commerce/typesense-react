# Date Filtering Examples

This guide shows how to implement date filtering using the new utilities and hooks in typesense-react.

## Basic Setup with Default Date Filter

### Using `additionalFilters` directly (original approach)

```tsx
import { SearchProvider } from '@jungle-commerce/typesense-react';

// Calculate default date range (last 30 days)
const getDefaultDateFilter = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  
  const startTimestamp = Math.floor(start.getTime() / 1000);
  const endTimestamp = Math.floor(end.getTime() / 1000);
  
  return `orderedAt:[${startTimestamp}..${endTimestamp}]`;
};

<SearchProvider
  config={typesenseConfig}
  collection="orders"
  initialState={{
    additionalFilters: getDefaultDateFilter()
  }}
>
  <App />
</SearchProvider>
```

### Using new date filter helpers (recommended)

```tsx
import { SearchProvider } from '@jungle-commerce/typesense-react';
import { getLastNDaysFilter } from '@jungle-commerce/typesense-react';

<SearchProvider
  config={typesenseConfig}
  collection="orders"
  initialState={{
    additionalFilters: getLastNDaysFilter('orderedAt', 30)
  }}
>
  <App />
</SearchProvider>
```

## Date Filter Component with Presets

```tsx
import { useDateFilter } from '@jungle-commerce/typesense-react';

function DateFilterControls() {
  const dateFilter = useDateFilter();
  
  return (
    <div>
      <h3>Quick Date Filters</h3>
      
      {/* Preset buttons */}
      <button onClick={() => dateFilter.applyPreset('orderedAt', 'TODAY')}>
        Today
      </button>
      <button onClick={() => dateFilter.applyPreset('orderedAt', 'LAST_7_DAYS')}>
        Last 7 Days
      </button>
      <button onClick={() => dateFilter.applyPreset('orderedAt', 'LAST_30_DAYS')}>
        Last 30 Days
      </button>
      <button onClick={() => dateFilter.applyPreset('orderedAt', 'THIS_MONTH')}>
        This Month
      </button>
      <button onClick={() => dateFilter.applyPreset('orderedAt', 'THIS_YEAR')}>
        This Year
      </button>
      
      {/* Custom date range */}
      <DateRangePicker
        onChange={(start, end) => dateFilter.setDateRange('orderedAt', start, end)}
      />
      
      {/* Clear filter */}
      {dateFilter.hasDateFilter('orderedAt') && (
        <button onClick={() => dateFilter.clearDateFilter('orderedAt')}>
          Clear Date Filter
        </button>
      )}
    </div>
  );
}
```

## Managing Multiple Fields with Date Filters

```tsx
import { useDateFilter } from '@jungle-commerce/typesense-react';

function MultiDateFilters() {
  const dateFilter = useDateFilter();
  
  // Order date filter
  const handleOrderDateChange = (preset: string) => {
    switch (preset) {
      case 'last7':
        dateFilter.setLastNDays('orderedAt', 7);
        break;
      case 'last30':
        dateFilter.setLastNDays('orderedAt', 30);
        break;
      case 'thisMonth':
        dateFilter.setCurrentMonth('orderedAt');
        break;
    }
  };
  
  // Delivery date filter
  const handleDeliveryDateChange = (start: Date, end: Date) => {
    dateFilter.setDateRange('deliveredAt', start, end);
  };
  
  // Show current filters
  const orderDateRange = dateFilter.getDateRange('orderedAt');
  const deliveryDateRange = dateFilter.getDateRange('deliveredAt');
  
  return (
    <div>
      <div>
        <h4>Order Date</h4>
        <select onChange={(e) => handleOrderDateChange(e.target.value)}>
          <option value="">All Time</option>
          <option value="last7">Last 7 Days</option>
          <option value="last30">Last 30 Days</option>
          <option value="thisMonth">This Month</option>
        </select>
        {orderDateRange && (
          <p>
            Showing orders from {orderDateRange.start.toLocaleDateString()} 
            to {orderDateRange.end.toLocaleDateString()}
          </p>
        )}
      </div>
      
      <div>
        <h4>Delivery Date</h4>
        <DateRangePicker onChange={handleDeliveryDateChange} />
        {deliveryDateRange && (
          <p>
            Showing deliveries from {deliveryDateRange.start.toLocaleDateString()} 
            to {deliveryDateRange.end.toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
```

## Using Field-Specific Hook

```tsx
import { useDateFieldFilter } from '@jungle-commerce/typesense-react';

function OrderDateFilter() {
  // Hook specifically for the 'orderedAt' field
  const orderDate = useDateFieldFilter('orderedAt');
  
  return (
    <div>
      <h3>Order Date Filter</h3>
      
      {/* Simplified API - no need to pass field name */}
      <button onClick={() => orderDate.setLastNDays(7)}>Last 7 Days</button>
      <button onClick={() => orderDate.setLastNDays(30)}>Last 30 Days</button>
      <button onClick={() => orderDate.setCurrentMonth()}>This Month</button>
      <button onClick={() => orderDate.setCurrentYear()}>This Year</button>
      
      {/* Custom ranges */}
      <button onClick={() => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 90);
        orderDate.setDateRange(start, end);
      }}>
        Last 90 Days
      </button>
      
      {/* Clear */}
      {orderDate.hasFilter() && (
        <button onClick={() => orderDate.clear()}>
          Clear Filter
        </button>
      )}
    </div>
  );
}
```

## Combining Date Filters with Other Additional Filters

```tsx
import { useAdditionalFilters, useDateFilter } from '@jungle-commerce/typesense-react';

function CombinedFilters() {
  const additionalFilters = useAdditionalFilters();
  const dateFilter = useDateFilter();
  
  // Set date filter
  const handleDateChange = (days: number) => {
    dateFilter.setLastNDays('orderedAt', days);
  };
  
  // Toggle other filters
  const toggleFeatured = () => {
    if (additionalFilters.hasFilter('featured')) {
      additionalFilters.removeFilter('featured');
    } else {
      additionalFilters.setFilter('featured', 'featured:true');
    }
  };
  
  const toggleInStock = () => {
    if (additionalFilters.hasFilter('in_stock')) {
      additionalFilters.removeFilter('in_stock');
    } else {
      additionalFilters.setFilter('in_stock', 'in_stock:true');
    }
  };
  
  // Show active filters
  const activeFilters = Array.from(additionalFilters.filters.entries());
  
  return (
    <div>
      <h3>Filters</h3>
      
      {/* Date filter */}
      <div>
        <label>Date Range:</label>
        <select onChange={(e) => handleDateChange(Number(e.target.value))}>
          <option value="0">All Time</option>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
        </select>
      </div>
      
      {/* Other filters */}
      <label>
        <input 
          type="checkbox" 
          checked={additionalFilters.hasFilter('featured')}
          onChange={toggleFeatured}
        />
        Featured Only
      </label>
      
      <label>
        <input 
          type="checkbox" 
          checked={additionalFilters.hasFilter('in_stock')}
          onChange={toggleInStock}
        />
        In Stock Only
      </label>
      
      {/* Active filters display */}
      {activeFilters.length > 0 && (
        <div>
          <h4>Active Filters:</h4>
          {activeFilters.map(([field, filter]) => (
            <div key={field}>
              {field}: {filter}
              <button onClick={() => additionalFilters.removeFilter(field)}>×</button>
            </div>
          ))}
          <button onClick={() => additionalFilters.clearFilters()}>
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
```

## Advanced: Dynamic Date Filters Based on Schema

```tsx
import { useSchemaDiscovery, useDateFilter } from '@jungle-commerce/typesense-react';

function DynamicDateFilters() {
  const { schema } = useSchemaDiscovery({ collection: 'orders' });
  const dateFilter = useDateFilter();
  
  // Find all date fields in the schema
  const dateFields = schema?.fields.filter(field => 
    field.type === 'int64' && (
      field.name.includes('_at') || 
      field.name.includes('_date') ||
      field.name.includes('timestamp')
    )
  ) || [];
  
  return (
    <div>
      <h3>Date Filters</h3>
      {dateFields.map(field => (
        <div key={field.name}>
          <h4>{field.name}</h4>
          <select 
            onChange={(e) => {
              const days = Number(e.target.value);
              if (days === 0) {
                dateFilter.clearDateFilter(field.name);
              } else {
                dateFilter.setLastNDays(field.name, days);
              }
            }}
          >
            <option value="0">All Time</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
        </div>
      ))}
    </div>
  );
}
```

## Best Practices

1. **Set meaningful defaults**: Use `getLastNDaysFilter` or presets in `initialState`
2. **Provide quick presets**: Users often want common ranges like "Last 7 days"
3. **Show active filters**: Display what date range is currently active
4. **Allow clearing**: Always provide a way to remove date filters
5. **Consider timezone**: Be aware of timezone differences when setting dates
6. **Validate ranges**: Ensure start date is before end date

## Available Date Filter Utilities

### Helper Functions
- `getLastNDaysFilter(field, days)` - Last N days from today
- `getDateRangeFilter(field, start, end)` - Specific date range
- `getCurrentMonthFilter(field)` - Current calendar month
- `getCurrentYearFilter(field)` - Current calendar year
- `getLastNMonthsFilter(field, months)` - Last N months
- `getMonthFilter(field, year, month)` - Specific month
- `getAfterDateFilter(field, date)` - All dates after
- `getBeforeDateFilter(field, date)` - All dates before

### Date Range Presets
- `DateRangePresets.TODAY`
- `DateRangePresets.LAST_7_DAYS`
- `DateRangePresets.LAST_30_DAYS`
- `DateRangePresets.LAST_90_DAYS`
- `DateRangePresets.THIS_MONTH`
- `DateRangePresets.THIS_YEAR`
- `DateRangePresets.LAST_3_MONTHS`
- `DateRangePresets.LAST_6_MONTHS`