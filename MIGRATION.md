# Migration Guide

This guide helps you migrate between major versions of `@jungle-commerce/typesense-react`.

## Migrating from 3.0.x to 3.1.0

Search scheduling is now owned by `SearchProvider` (one search per state change for the whole tree) instead of every `useSearch()` call site scheduling its own. For most apps **no code changes are required** — but review the notes below if you used per-hook search options.

### Per-hook options that moved to the provider

```tsx
// Before: per-hook (each call site scheduled its own searches)
useSearch({ searchOnMount: false, debounceMs: 150 });

// After: provider-level (single scheduler)
<SearchProvider searchOnMount={false} debounceMs={150} ...>
```

- `useSearch({ searchOnMount })` and `useSearch({ debounceMs })` are ignored. Set them on the provider.
- `SearchProvider`'s `searchOnMount` now defaults to `true` (matching the old effective behaviour, since the per-hook default was `true`). Pass `searchOnMount={false}` explicitly if you render a provider that must not search on mount.
- `useSearch({ queryBy, maxFacetValues })` still work but only affect that hook's own `actions.search()` calls; auto-searches use the new provider-level `queryBy` / `maxFacetValues` props.

### If you already pass `searchOnMount={false}` to SearchProvider

In 3.0.x that prop was **inert** — the per-hook default (`true`) always won, so your tree mount-searched anyway. In 3.1.0 the provider prop is authoritative: the initial search is suppressed. If your list page relied on the old behaviour, delete the prop. Note the new semantics are "skip only the initial search": later query changes (an autocomplete driving `setQuery`) still search normally.

Related: a provider tree with **zero** `useSearch()` consumers previously never searched; the provider now runs the mount search itself unless `searchOnMount={false}`.

### Hand-built SearchContext mocks in tests

`SearchContextValue` gained a required `searchEngine` field, which `useSearch()` subscribes to. If your tests build a context value by hand (per the context-api docs), add a stub:

```tsx
const mockContextValue: SearchContextValue = {
  state: mockState,
  dispatch: vi.fn(),
  client: mockClient,
  collection: 'products',
  searchEngine: {
    search: vi.fn(async () => {}),
    buildRequest: vi.fn(() => ({ q: '*', query_by: '*' })),
    subscribe: vi.fn(() => () => {}),
  },
  config: { searchOnMount: true, performanceMode: false, enableDisjunctiveFacetQueries: true },
};
```

### Search lifecycle callbacks are provider-wide

`onSearchSuccess` / `onSearchError` passed to `useSearch()` now fire for every completed search in the provider tree, not only searches that hook triggered. If a callback must react only to its own searches, correlate through request state rather than assuming the trigger.

### No functional change to faceting

Disjunctive (multi-select) faceting is unchanged: one main query plus one exclusion query per active facet group, merged into the same result shape. The deduplication layers only collapse *byte-identical concurrent* requests, which were pure waste.

## Migrating to 2.0.3

### Bug Fixes

#### Disjunctive Facet Counts with Additional Filters

Version 2.0.3 properly fixes an issue where disjunctive facet counts were not updating when additional filters changed. If you were experiencing incorrect facet counts when combining disjunctive facets with date filters or other additional filters, this has been resolved.

Note: Version 2.0.2 had an incomplete fix for this issue. Please upgrade directly to 2.0.3.

No code changes are required - simply upgrade to 2.0.3:

```bash
npm install @jungle-commerce/typesense-react@2.0.3
```

## Migrating from 1.1.x to 1.2.x

### Breaking Changes

#### React Version Requirement

The minimum React version is now 18.0.0. If you're using an older version of React, you'll need to upgrade:

```bash
npm install react@^18.0.0 react-dom@^18.0.0
```

### New Features

Version 1.2.x introduces several new features that don't require migration but are available for use:

#### Multi-Collection Search

You can now search across multiple collections using the `MultiCollectionProvider`:

```tsx
import { MultiCollectionProvider, useMultiCollectionSearch } from '@jungle-commerce/typesense-react';

// Before (single collection)
<SearchProvider collectionName="products" client={typesenseClient}>
  {/* Your app */}
</SearchProvider>

// Now available (multi-collection)
<MultiCollectionProvider 
  collections={['products', 'categories', 'brands']} 
  client={typesenseClient}
>
  {/* Your app */}
</MultiCollectionProvider>
```

#### Advanced Faceting

New hooks for advanced faceting capabilities:

```tsx
// Numeric range facets
const { range, setRange } = useNumericFacetRange('price');

// Date filtering
const { dateRange, setDateRange } = useDateFilter('created_at');

// Advanced facet management
const { facets, toggleFacet } = useAdvancedFacets();
```

#### Schema Discovery

Automatic schema discovery and validation:

```tsx
const { schema, loading, error } = useSchemaDiscovery('products');
```

### Deprecations

No APIs have been deprecated in this release. All existing code should continue to work.

## Migrating from 1.0.x to 1.1.x

### Package Name Change

The package has been renamed from `typesense-react` to `@jungle-commerce/typesense-react`:

```json
// Before
"dependencies": {
  "typesense-react": "^1.0.0"
}

// After
"dependencies": {
  "@jungle-commerce/typesense-react": "^1.1.0"
}
```

Update your imports:

```tsx
// Before
import { SearchProvider, useSearch } from 'typesense-react';

// After
import { SearchProvider, useSearch } from '@jungle-commerce/typesense-react';
```

### API Changes

No breaking API changes in this version. All existing code should work after updating the package name.

## General Migration Tips

1. **Test Thoroughly**: After upgrading, run your test suite and manually test critical search functionality.

2. **Gradual Migration**: For large applications, consider migrating one component at a time.

3. **TypeScript**: If you're using TypeScript, you may see new type errors after upgrading. These usually indicate potential issues in your code that the improved types have caught.

4. **Performance**: Version 1.2.x includes performance improvements. You may want to review and potentially remove any workarounds you implemented for performance issues.

## Getting Help

If you encounter issues during migration:

1. Check the [CHANGELOG](./CHANGELOG.md) for detailed changes
2. Review the [examples](./examples/) for updated usage patterns
3. Search [existing issues](https://github.com/jungle-commerce/typesense-react/issues)
4. Create a new issue with the `migration` label

## Version Support

- Version 1.2.x: Actively maintained
- Version 1.1.x: Security fixes only
- Version 1.0.x: No longer supported

We recommend upgrading to the latest version to receive bug fixes, security updates, and new features.