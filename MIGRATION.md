# Migration Guide

This guide helps you migrate between major versions of `@jungle-commerce/typesense-react`.

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