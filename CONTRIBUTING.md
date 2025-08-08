# Contributing to Enhanced SQL Database Analyzer

We love your input! We want to make contributing to Enhanced SQL Database Analyzer as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## 🚀 Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Quick Start

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/sql-optimizer.git
   cd sql-optimizer
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

5. **Make your changes**
6. **Test your changes**
   ```bash
   npm test
   npm run lint
   npm run build
   ```

7. **Commit and push**
   ```bash
   git commit -m "Add amazing feature"
   git push origin feature/amazing-feature
   ```

8. **Create a Pull Request**

## 📝 Pull Request Process

### Before Submitting

- [ ] Ensure your code follows our coding standards
- [ ] Run the full test suite (`npm test`)
- [ ] Run linting (`npm run lint`)
- [ ] Ensure the build passes (`npm run build`)
- [ ] Update documentation if needed
- [ ] Add tests for new functionality

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] New and existing unit tests pass
```

## 🐛 Bug Reports

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/vasoyaprince14/sql-optimizer/issues).

### Great Bug Reports Include:

- **Summary**: Quick summary and/or background
- **Steps to Reproduce**: Be specific!
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happens
- **Environment**: 
  - OS & version
  - Node.js version
  - PostgreSQL version
  - Package version
- **Sample Code**: If possible, provide a minimal code example
- **Screenshots**: If applicable

### Bug Report Template

```markdown
## Bug Description
A clear and concise description of what the bug is.

## To Reproduce
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
A clear and concise description of what you expected to happen.

## Screenshots
If applicable, add screenshots to help explain your problem.

## Environment
- OS: [e.g. macOS 12.0]
- Node.js: [e.g. 18.0.0]
- PostgreSQL: [e.g. 15.0]
- Package version: [e.g. 1.0.0]

## Additional Context
Add any other context about the problem here.
```

## 💡 Feature Requests

We welcome feature requests! Please provide:

- **Use Case**: Describe your use case and why this feature would be valuable
- **Proposed Solution**: Describe how you envision this feature working
- **Alternatives**: Describe alternatives you've considered
- **Examples**: Provide examples or mockups if applicable

### Feature Request Template

```markdown
## Feature Description
A clear and concise description of the feature you'd like to see.

## Use Case
Describe the use case and why this feature would be valuable.

## Proposed Solution
Describe how you envision this feature working.

## Alternatives Considered
Describe alternatives you've considered.

## Additional Context
Add any other context, screenshots, or examples about the feature request here.
```

## 🏗️ Development Guidelines

### Code Style

We use ESLint and Prettier for code formatting:

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### TypeScript Guidelines

- Use strict TypeScript configuration
- Provide proper type definitions
- Avoid using `any` type when possible
- Use interfaces for object shapes
- Use enums for constants

### File Structure

```
src/
├── enhanced-*.ts         # Enhanced implementation
├── config.ts            # Configuration management
├── index.ts             # Main entry point
├── types.ts            # TypeScript interfaces
└── legacy/             # Legacy compatibility files

bin/
└── enhanced-cli.ts     # CLI implementation

test/
├── unit/               # Unit tests
├── integration/        # Integration tests
└── fixtures/           # Test fixtures

examples/
├── quick-start.js      # Basic usage examples
├── advanced-usage.js   # Advanced examples
└── *.config.json      # Configuration examples
```

### Testing Guidelines

- Write unit tests for all new functionality
- Use Jest for testing framework
- Aim for >90% code coverage
- Include both positive and negative test cases
- Test error conditions

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

#### Examples:
```
feat(analyzer): add MySQL database support
fix(cli): resolve connection timeout issue
docs(readme): update installation instructions
test(analyzer): add unit tests for schema analysis
```

## 🗄️ Database Support

### Adding New Database Support

To add support for a new database:

1. **Create Database Client**
   ```typescript
   // src/clients/mysql-client.ts
   export class MySQLClient implements DatabaseClient {
     async connect(): Promise<void> { /* ... */ }
     async disconnect(): Promise<void> { /* ... */ }
     async query(sql: string): Promise<any> { /* ... */ }
   }
   ```

2. **Implement Database Auditor**
   ```typescript
   // src/auditors/mysql-auditor.ts
   export class MySQLDatabaseAuditor extends BaseDatabaseAuditor {
     async analyzeSchema(): Promise<SchemaAnalysis> { /* ... */ }
     async analyzeIndexes(): Promise<IndexAnalysis> { /* ... */ }
     // ... other methods
   }
   ```

3. **Add Database Detection**
   ```typescript
   // src/database-factory.ts
   export function createDatabaseClient(connectionString: string): DatabaseClient {
     if (connectionString.startsWith('mysql://')) {
       return new MySQLClient(connectionString);
     }
     // ... other databases
   }
   ```

4. **Add Tests**
   ```typescript
   // test/mysql-client.test.ts
   describe('MySQLClient', () => {
     // ... tests
   });
   ```

### Database-Specific Guidelines

- Follow the `DatabaseClient` interface
- Implement all required analysis methods
- Handle database-specific SQL syntax
- Provide appropriate error messages
- Include comprehensive tests

## 🔧 Adding New Analysis Features

### Creating New Analyzers

1. **Define Interfaces**
   ```typescript
   // src/types.ts
   export interface CustomAnalysis {
     score: number;
     issues: CustomIssue[];
     recommendations: CustomRecommendation[];
   }
   ```

2. **Implement Analyzer**
   ```typescript
   // src/analyzers/custom-analyzer.ts
   export class CustomAnalyzer {
     async analyze(client: DatabaseClient): Promise<CustomAnalysis> {
       // Implementation
     }
   }
   ```

3. **Integrate with Main Auditor**
   ```typescript
   // src/enhanced-database-auditor.ts
   async performComprehensiveAudit(): Promise<EnhancedDatabaseHealthReport> {
     // ... existing code
     const customAnalysis = await this.customAnalyzer.analyze(this.client);
     // ... integrate results
   }
   ```

4. **Update Report Generator**
   ```typescript
   // src/enhanced-report-generator.ts
   private generateCustomAnalysisSection(analysis: CustomAnalysis): string {
     // Generate HTML/CLI output
   }
   ```

## 📊 Report Enhancements

### Adding New Report Sections

1. **Update Report Interface**
   ```typescript
   // src/types.ts or src/enhanced-database-auditor.ts
   export interface EnhancedDatabaseHealthReport {
     // ... existing properties
     customSection: CustomSectionData;
   }
   ```

2. **Generate Section Content**
   ```typescript
   // src/enhanced-report-generator.ts
   private generateCustomSection(data: CustomSectionData): string {
     return `
     <div class="section">
       <div class="section-header">
         <h2><i class="fas fa-custom"></i> Custom Section</h2>
       </div>
       <div class="section-content">
         <!-- Custom content -->
       </div>
     </div>`;
   }
   ```

3. **Add to Main Report**
   ```typescript
   // In generateEnhancedHTMLReport method
   ${this.generateCustomSection(report.customSection)}
   ```

## 🎨 UI/UX Guidelines

### HTML Report Styling

- Use consistent color scheme
- Maintain responsive design
- Follow accessibility guidelines
- Use Font Awesome icons
- Implement hover effects and animations

### CLI Output Guidelines

- Use colors appropriately (chalk.js)
- Provide clear progress indicators
- Use emojis sparingly and consistently
- Ensure output is readable in different terminals

## 🧪 Testing

### Unit Testing

```typescript
// test/example.test.ts
import { CustomAnalyzer } from '../src/analyzers/custom-analyzer';

describe('CustomAnalyzer', () => {
  let analyzer: CustomAnalyzer;
  let mockClient: jest.Mocked<DatabaseClient>;

  beforeEach(() => {
    mockClient = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      query: jest.fn()
    };
    analyzer = new CustomAnalyzer();
  });

  describe('analyze', () => {
    it('should return analysis results', async () => {
      // Arrange
      mockClient.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await analyzer.analyze(mockClient);

      // Assert
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(10);
    });
  });
});
```

### Integration Testing

```typescript
// test/integration/database.test.ts
describe('Database Integration', () => {
  let client: DatabaseClient;

  beforeAll(async () => {
    // Setup test database
    client = new PostgreSQLClient(process.env.TEST_DATABASE_URL);
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  it('should perform full analysis', async () => {
    const auditor = new EnhancedDatabaseHealthAuditor(client);
    const report = await auditor.performComprehensiveAudit();
    
    expect(report).toBeDefined();
    expect(report.databaseInfo).toBeDefined();
    expect(report.schemaHealth).toBeDefined();
  });
});
```

## 📚 Documentation

### Code Documentation

- Use JSDoc comments for public APIs
- Include examples in documentation
- Document complex algorithms
- Explain non-obvious code

```typescript
/**
 * Analyzes database schema health and returns recommendations
 * 
 * @param client - Database client instance
 * @param options - Analysis options
 * @returns Promise resolving to schema analysis results
 * 
 * @example
 * ```typescript
 * const analyzer = new SchemaAnalyzer();
 * const results = await analyzer.analyze(client, { includeIndexes: true });
 * console.log(`Schema score: ${results.score}/10`);
 * ```
 */
async analyze(client: DatabaseClient, options?: AnalysisOptions): Promise<SchemaAnalysis> {
  // Implementation
}
```

### README Updates

When adding new features:
- Update feature list
- Add usage examples
- Update CLI command documentation
- Include configuration options

## 🚀 Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

- [ ] Update version in `package.json`
- [ ] Update version references in code
- [ ] Update `CHANGELOG.md`
- [ ] Run full test suite
- [ ] Build and test package
- [ ] Create git tag
- [ ] Publish to npm
- [ ] Create GitHub release

### Publishing Steps

```bash
npm ci
npm run type-check
npm run build
npm test

# bump version (choose one)
npm version patch   # 1.0.1
# npm version minor # 1.1.0
# npm version major # 2.0.0

git push && git push --tags

# publish (scoped public package)
npm publish --access public
```

Ensure `prepublishOnly` passes (tests, lint, type-check). Releases should be done from `main` after PR approval and green CI.

### Repository Protection

- Require PR reviews for `main`
- Require green status checks (CI) before merge
- Protect `main` from force pushes and deletions
- Enable signed commits and branch rules where possible
- Use `CODEOWNERS` to mandate reviews from maintainers

## ❓ Questions?

- **General Questions**: Create a [Discussion](https://github.com/vasoyaprince14/sql-optimizer/discussions)
- **Bug Reports**: Create an [Issue](https://github.com/vasoyaprince14/sql-optimizer/issues)
- **Feature Requests**: Create an [Issue](https://github.com/vasoyaprince14/sql-optimizer/issues)

## 📜 Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team. All complaints will be reviewed and investigated promptly and fairly.

---

Thank you for contributing to Enhanced SQL Database Analyzer! 🎉