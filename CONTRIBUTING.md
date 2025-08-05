# Contributing to SQL Optimizer

First off, thank you for considering contributing to SQL Optimizer! 🎉

The following is a set of guidelines for contributing to SQL Optimizer. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Testing Guidelines](#testing-guidelines)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find that the bug has already been reported. When you create a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** to demonstrate the steps
- **Describe the behavior you observed** and what behavior you expected
- **Include screenshots or code snippets** if relevant
- **Specify your environment** (OS, Node.js version, PostgreSQL version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description** of the suggested enhancement
- **Provide specific examples** to demonstrate the enhancement
- **Describe the current behavior** and explain the behavior you expected
- **Explain why this enhancement would be useful**

### Your First Code Contribution

Unsure where to begin contributing? You can start by looking through these `beginner` and `help-wanted` issues:

- **Beginner issues** - issues which should only require a few lines of code
- **Help wanted issues** - issues which should be a bit more involved

### Pull Requests

The process described here has several goals:

- Maintain the project's quality
- Fix problems that are important to users
- Engage the community in working toward the best possible SQL Optimizer
- Enable a sustainable system for maintainers to review contributions

## Development Setup

### Prerequisites

- Node.js 16.0.0 or higher
- PostgreSQL 12.0 or higher
- npm or yarn package manager

### Installation

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/sql-optimizer.git
   cd sql-optimizer
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

5. **Set up test database**:
   ```bash
   # Using Docker (recommended)
   docker run --name postgres-dev -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14
   
   # Or use your local PostgreSQL instance
   createdb sql_optimizer_test
   ```

6. **Build the project**:
   ```bash
   npm run build
   ```

7. **Run tests**:
   ```bash
   npm test
   ```

### Development Workflow

1. **Create a branch** for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** following the style guidelines below

3. **Test your changes**:
   ```bash
   npm test
   npm run lint
   npm run build
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add new feature" # or "fix: resolve bug"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub

## Pull Request Process

1. **Update documentation** - Ensure the README.md is updated with details of changes if applicable
2. **Add tests** - Include tests for new functionality
3. **Update CHANGELOG** - Add your changes to the unreleased section
4. **Follow commit conventions** - Use conventional commit messages
5. **Ensure CI passes** - All tests and linting must pass
6. **Request review** - Tag maintainers for review

### Commit Message Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts

Examples:
```
feat(analyzer): add query complexity scoring
fix(cli): resolve issue with batch processing
docs: update installation instructions
test(optimizer): add tests for schema analysis
```

## Style Guidelines

### TypeScript Style Guide

- **Use TypeScript** for all new code
- **Follow existing patterns** in the codebase
- **Use meaningful variable names** - `executionTime` instead of `et`
- **Add JSDoc comments** for public APIs
- **Use interfaces** for type definitions
- **Prefer async/await** over promises

### Code Formatting

We use Prettier for code formatting. Run before committing:

```bash
npm run format
```

### Linting

We use ESLint for code linting. Fix issues before committing:

```bash
npm run lint:fix
```

### File Organization

- **One class per file** - Keep files focused
- **Use barrel exports** - Export from index.ts files
- **Group imports** - Node modules, then relative imports
- **Use path aliases** - `@/types` instead of `../../../types`

Example file structure:
```typescript
// External imports
import { Client } from 'pg';
import * as dotenv from 'dotenv';

// Internal imports
import { QueryAnalyzer } from './analyzer';
import { OptimizerConfig } from './types';

// Types
interface LocalInterface {
  // ...
}

// Class
export class MyClass {
  // ...
}
```

## Testing Guidelines

### Test Structure

- **Unit tests** - Test individual functions and classes
- **Integration tests** - Test database interactions
- **E2E tests** - Test CLI commands

### Writing Tests

```typescript
import { QueryAnalyzer } from '../src/analyzer';

describe('QueryAnalyzer', () => {
  let analyzer: QueryAnalyzer;

  beforeEach(() => {
    analyzer = new QueryAnalyzer(mockClient);
  });

  it('should analyze simple SELECT query', async () => {
    const result = await analyzer.analyze('SELECT * FROM users');
    
    expect(result.performance.executionTime).toBeGreaterThan(0);
    expect(result.issues).toBeDefined();
    expect(result.suggestions).toBeDefined();
  });
});
```

### Test Coverage

- Aim for **80%+ test coverage**
- **Test error cases** - Not just happy paths
- **Mock external dependencies** - Database, OpenAI API, etc.
- **Test CLI commands** - Ensure CLI works correctly

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm test analyzer.test.ts
```

## Project Structure

Understanding the project structure helps with contributing:

```
sql-optimizer/
├── src/                      # Source code
│   ├── optimizer.ts          # Main orchestrator
│   ├── analyzer.ts           # Query analysis
│   ├── ai-suggestions.ts     # OpenAI integration
│   ├── types.ts              # TypeScript definitions
│   └── ...                   # Other modules
├── bin/                      # CLI interface
│   └── cli.ts                # Command-line tool
├── test/                     # Test files
├── examples/                 # Example queries/schemas
├── .github/                  # GitHub Actions workflows
└── docs/                     # Additional documentation
```

## Getting Help

- **GitHub Issues** - For bugs and feature requests
- **GitHub Discussions** - For questions and general discussion
- **Email** - For private concerns or security issues

## Recognition

Contributors will be recognized in:
- README.md contributors section
- CHANGELOG.md for significant contributions
- Release notes for major features

Thank you for contributing! 🎉