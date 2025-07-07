# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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