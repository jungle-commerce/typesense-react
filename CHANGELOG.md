# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2026-08-04

### Fixed
- **Duplicate search storms**: search scheduling moved from `useSearch()` into the `SearchProvider` ("provider-level search engine"). Previously every `useSearch()` call site owned its own auto-search effect, so a page with N call sites (search box, results table, one per facet, ...) issued N byte-identical network requests on every mount, filter, sort, or page change — enough concurrent load to push requests past the HTTP client's connection timeout, whose automatic retries amplified the storm further. Any number of call sites now produce exactly one request per trigger.
- **In-flight request deduplication** in `TypesenseSearchClient`: concurrent identical requests share one network call (the result cache only helped after a response had landed). Distinct requests — e.g. the per-facet exclusion queries used for disjunctive faceting — are never merged. Failed requests are evicted so retries reach the network, and `clearCache()` also drops in-flight sharing so refresh flows can force freshness.
- Redundant repeat search after the mount search completed (the `searchPerformed` flip re-triggered the auto-search effect; previously masked by the response cache but still flashing the loading state).
- Query-change detection in the auto-search scheduler compared the query text against a serialized request key (always unequal), so every trigger took the debounced path. Text changes are now debounced and structural changes (filters, page, sort) search immediately, as documented.
- Disjunctive facet-count merging no longer mutates the response object (responses can be shared via the cache and in-flight deduplication).
- **Stale responses can no longer overwrite newer ones**: each search carries a sequence id and only the latest dispatched search commits its results (last *intent* wins, not last *arrival*). Rapid page/filter changes previously raced.
- An imperative `actions.search()` is honoured even while a byte-identical request is still in flight (the forced response wins via the sequence guard) — required by refresh flows that `clearCache()` then re-search.
- `actions.reset()` re-runs the initial search and repopulates the list (previously the rebuilt request could be skipped as a duplicate, leaving the list permanently blank).
- **Numeric facet bounds now use Typesense's exact facet `stats` (min/max)** instead of being derived from the returned top-N facet values. Stats are exact regardless of `max_facet_values`, so consumers can (and should) request far fewer facet values: faceting a high-cardinality numeric field with a large `max_facet_values` is O(distinct values) server-side — measured 12.4s for one float field over a 1.5M-doc filtered result set at the old 10000 default vs 0.6s at 50 — while range-slider bounds stay exact. With `accumulateFacets`, bounds now monotonically widen (union of accumulated and current) instead of being pinned to accumulated values.

### Changed
- `SearchProvider` gains `debounceMs` (default 300), `maxFacetValues` (default 10000) and `queryBy` props — these were previously per-hook options.
- `SearchProvider`'s `searchOnMount` default changed from `false` to `true`, preserving observable behaviour: the old per-hook default was `true`, so any consumer mounting under a bare provider triggered the mount search anyway.
- **⚠️ An explicit `searchOnMount={false}` on `SearchProvider` now takes effect** — in 3.0.x that prop was inert (the per-hook default always won). Trees passing it will no longer search on mount; it suppresses *only* the initial search, and later query changes (typing) still search. Remove the prop if your tree relied on the old always-mount-search behaviour.
- A `SearchProvider` now owns the mount search itself: a provider tree with zero `useSearch()` consumers (e.g. only `useAdvancedFacets` readers) previously never searched; it now does unless `searchOnMount={false}`.
- `useSearch({ searchOnMount, debounceMs })` are deprecated no-ops — set them on `SearchProvider` instead. `queryBy`/`maxFacetValues` hook options now only apply to that hook's imperative `actions.search()` calls.
- `useSearch({ onSearchSuccess, onSearchError })` now fire for **every** search the provider completes, not only searches triggered by that hook instance.
- `SearchContextValue` exposes the new `searchEngine` (`search`, `buildRequest`, `subscribe`).

### Added
- `buildSearchRequest` utility export (pure request builder shared by the engine and imperative searches).
- `getCacheStats()` now reports `inFlightCount`.
- Restored `page` on `MultiCollectionSearchRequest` — the pagination parameter was lost in the v3 rewrite, so every multi-collection search silently returned page 1.

### Tests
- The dormant integration suite (never run since CI broke) is repaired: 195/195 against a real Typesense server. Most failures were v2-era API drift in the tests; genuine library fixes that came out of it are the multi-collection `page` restoration above and idempotent test seeding.

## [2.0.3] - 2025-01-03

### Fixed
- Fixed disjunctive facet counts not updating when additional filters change. Implemented a ref-based solution to avoid React closure issues where the `performSearch` callback was using stale state values. Now disjunctive facet queries correctly include all current filters (including date filters and additional filters) when calculating facet counts.

## [2.0.2] - 2025-01-03

### Fixed
- Initial attempt to fix disjunctive facet counts not updating when additional filters change (incomplete fix - use 2.0.3 instead)

## [1.2.1] - 2025-01-01

### Added
- Complete test suite with unit and integration tests
- Comprehensive documentation for testing infrastructure
- Docker Compose setup for testing environment
- GitHub Actions CI/CD pipeline
- Support for multi-collection search with `MultiCollectionProvider`
- Advanced faceting capabilities with `useAdvancedFacets` hook
- Date filtering support with `useDateFilter` hook
- Numeric range faceting with `useNumericFacetRange` hook
- Schema discovery and validation utilities
- Accumulated facets functionality
- Additional filters management
- Error handling improvements

### Changed
- Upgraded React peer dependency to support React 18+
- Improved TypeScript types and exports
- Enhanced search performance with optimized reducers
- Better error messages and validation

### Fixed
- Test suite compatibility issues
- Build configuration for proper ESM/CJS dual package support
- Type definitions export paths

## [1.2.0] - 2024-12-15

### Added
- NPM publish settings
- Initial package configuration

### Changed
- Package name refactored to `@jungle-commerce/typesense-react`
- Updated README with better examples

## [1.1.0] - 2024-12-01

### Added
- Basic search functionality with `SearchProvider`
- Core hooks: `useSearch`, `useFacetState`, `useFacetMode`
- TypesenseClient wrapper
- Basic examples (basic-search, advanced-filtering)

## [1.0.0] - 2024-11-15

### Added
- Initial release
- Core search provider implementation
- Basic TypeScript support
- Vite build configuration