# Contributing to Typesense React

Thank you for your interest in contributing to Typesense React! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/typesense-react.git
   cd typesense-react
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/jungle-commerce/typesense-react.git
   ```

## Development Setup

### Prerequisites

- Node.js 18+ and pnpm
- Docker and Docker Compose (for integration tests)
- A Typesense server (local or cloud instance)

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Build the project:
   ```bash
   pnpm build
   ```

3. Run tests:
   ```bash
   pnpm test
   ```

### Running Examples

Each example has its own setup:

```bash
cd examples/basic-search
pnpm install
pnpm dev
```

## How to Contribute

### Finding Issues

- Check the [issue tracker](https://github.com/jungle-commerce/typesense-react/issues) for open issues
- Look for issues labeled `good first issue` or `help wanted`
- Feel free to ask questions on existing issues

### Making Changes

1. Create a new branch for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the coding standards

3. Write or update tests as needed

4. Ensure all tests pass:
   ```bash
   pnpm test
   pnpm test:integration
   ```

5. Update documentation if necessary

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Provide comprehensive type definitions
- Avoid using `any` type

### Code Style

- Follow the existing code style
- Use ESLint and Prettier configurations provided
- Run `pnpm lint` before committing

### React Best Practices

- Use functional components and hooks
- Implement proper error boundaries
- Memoize expensive computations
- Follow React naming conventions

### File Organization

```
src/
├── core/          # Core functionality
├── hooks/         # React hooks
├── providers/     # Context providers
├── types/         # TypeScript types
└── utils/         # Utility functions
```

## Testing Guidelines

### Unit Tests

- Write unit tests for all new functions and hooks
- Place tests in `__tests__` directories
- Use descriptive test names
- Mock external dependencies

Example:
```typescript
describe('useSearch', () => {
  it('should return search results when query is provided', () => {
    // Test implementation
  });
});
```

### Integration Tests

- Test complete user workflows
- Use the Docker test environment
- Ensure tests are deterministic
- Clean up test data after each test

### Running Tests

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# Test coverage
pnpm test:coverage
```

## Submitting Changes

### Pull Request Process

1. Update your branch with the latest upstream changes:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

3. Create a pull request on GitHub

4. Fill out the pull request template completely

5. Ensure all CI checks pass

### Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Write clear, descriptive commit messages
- Reference any related issues
- Update documentation as needed
- Add tests for new functionality
- Ensure backward compatibility

### Commit Message Format

Follow conventional commits:
```
type(scope): subject

body

footer
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test additions or modifications
- `refactor`: Code refactoring
- `style`: Code style changes
- `perf`: Performance improvements
- `chore`: Maintenance tasks

Example:
```
feat(hooks): add useAdvancedSearch hook

Implements advanced search functionality with support for
multiple collections and complex filtering.

Closes #123
```

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Minimal steps to reproduce the issue
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**:
   - Typesense React version
   - React version
   - Node.js version
   - Browser (if applicable)
   - Typesense server version
6. **Code Example**: Minimal reproducible example
7. **Error Messages**: Any error messages or stack traces

### Feature Requests

For feature requests, please include:

1. **Use Case**: Describe the problem you're trying to solve
2. **Proposed Solution**: Your suggested approach
3. **Alternatives**: Any alternative solutions you've considered
4. **Additional Context**: Any other relevant information

## Questions?

If you have questions about contributing:

1. Check the [documentation](./docs/)
2. Search existing issues
3. Create a new issue with the `question` label
4. Reach out to the maintainers

Thank you for contributing to Typesense React!