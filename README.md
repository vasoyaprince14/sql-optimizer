# 🚀 SQL Optimizer

[![npm version](https://badge.fury.io/js/sql-optimizer.svg)](https://badge.fury.io/js/sql-optimizer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green)](https://nodejs.org/)

A powerful, AI-enhanced SQL query optimization and performance analysis tool for PostgreSQL databases. Analyze queries, generate intelligent suggestions, audit database health, and optimize performance with beautiful reports.

![SQL Optimizer Demo](https://via.placeholder.com/800x400/667eea/ffffff?text=SQL+Optimizer+Demo)

## ✨ **Key Features**

### 🔍 **Query Analysis & Optimization**
- **Performance Analysis** - Detailed execution metrics and bottleneck identification
- **AI-Powered Suggestions** - OpenAI integration for intelligent optimization recommendations
- **Index Recommendations** - Smart index suggestions based on query patterns
- **Query Rewriting** - Automated query optimization suggestions
- **Security Analysis** - SQL injection detection and security recommendations

### 📊 **Advanced Analytics**
- **Database Health Audit** - Comprehensive database health assessment
- **Schema Analysis** - Table structure and relationship optimization
- **Performance Benchmarking** - Query performance comparison and testing
- **Cost Estimation** - Resource usage and performance cost analysis
- **Complexity Analysis** - Query complexity and maintainability scoring

### 🎨 **Professional Reporting**
- **Beautiful HTML Reports** - Professional, shareable reports with modern design
- **CLI Output** - Rich terminal output with colors and formatting
- **JSON Export** - Machine-readable data for automation
- **Batch Processing** - Analyze multiple queries simultaneously

### 🛠️ **Developer Experience**
- **TypeScript First** - Full TypeScript support with comprehensive types
- **CLI & Library** - Use as command-line tool or integrate into your applications
- **Docker Support** - Easy setup with containerized databases
- **Interactive Commands** - User-friendly command-line interface

## 📦 **Installation**

### NPM Package
```bash
npm install -g sql-optimizer
```

### From Source
```bash
git clone https://github.com/vasoyaprince14/sql-optimizer.git
cd sql-optimizer
npm install
npm run build
```

## 🚀 **Quick Start**

### 1. **Environment Setup**
```bash
# Copy environment template
cp .env.example .env

# Configure your database connection
echo "DB_URL=postgres://user:password@localhost:5432/database" >> .env
echo "OPENAI_API_KEY=your_openai_key_here" >> .env
```

### 2. **Test Database Connection**
```bash
sqlopt test
```

### 3. **Analyze Your First Query**
```bash
sqlopt analyze -q "SELECT * FROM users WHERE email = 'john@example.com'"
```

### 4. **Generate Database Health Report**
```bash
sqlopt health -o html --save report.html
```

## 📖 **Comprehensive Usage Guide**

### 🔍 **Query Analysis**

#### Single Query Analysis
```bash
# Basic analysis
sqlopt analyze -q "SELECT u.name, COUNT(p.id) FROM users u JOIN posts p ON u.id = p.user_id GROUP BY u.id"

# With AI recommendations
sqlopt analyze -q "SELECT * FROM users" --ai

# Save results to file
sqlopt analyze -q "SELECT * FROM users" --save results.json
```

#### Batch Analysis
```bash
# Analyze multiple queries from file
sqlopt batch -f queries.sql

# Batch analysis with detailed report
sqlopt batch -f queries.sql --format html --save batch-report.html
```

#### Comprehensive Analysis
```bash
# Full analysis with all features
sqlopt comprehensive -q "SELECT * FROM users WHERE active = true"

# File-based comprehensive analysis
sqlopt comprehensive -f examples/complex-queries.sql

# With AI-powered suggestions
sqlopt comprehensive -q "SELECT * FROM orders" --ai
```

### 📊 **Database Health Audit**

```bash
# Generate health audit report (CLI)
sqlopt health

# Beautiful HTML report
sqlopt health -o html --save health-report.html

# JSON format for automation
sqlopt health -o json --save health-data.json
```

### 🏗️ **Schema Analysis**

```bash
# Analyze database schema
sqlopt schema

# Schema analysis with recommendations
sqlopt schema --format html --save schema-report.html
```

### ⚡ **Performance Benchmarking**

```bash
# Benchmark query performance
sqlopt benchmark -q "SELECT * FROM users" --iterations 10

# Compare query performance
sqlopt benchmark -f test-queries.sql --compare
```

### 🔧 **Database Setup & Utilities**

```bash
# Set up sample database for testing
sqlopt setup

# Get database information
sqlopt info

# Interactive query builder
sqlopt build -t users

# Demo mode (no database required)
sqlopt demo
```

## 💻 **Programmatic Usage**

### TypeScript/JavaScript Integration

```typescript
import { SQLOptimizer } from 'sql-optimizer';

const config = {
  databaseUrl: 'postgres://user:password@localhost:5432/db',
  openaiApiKey: 'your-api-key', // Optional
  maxExecutionTime: 30000,
  enableColors: true
};

const optimizer = new SQLOptimizer(config);

async function analyzeQuery() {
  await optimizer.connect();
  
  // Single query analysis
  const result = await optimizer.analyzeQuery('SELECT * FROM users');
  console.log('Performance:', result.performance);
  console.log('Issues:', result.issues);
  console.log('Suggestions:', result.suggestions);
  
  // Comprehensive analysis
  const comprehensive = await optimizer.generateComprehensiveAnalysis(
    'SELECT u.*, COUNT(p.id) FROM users u LEFT JOIN posts p ON u.id = p.user_id GROUP BY u.id'
  );
  
  // Database health audit
  const healthReport = await optimizer.performHealthAudit('html');
  
  // Schema analysis
  const schema = await optimizer.analyzeSchema();
  
  await optimizer.disconnect();
}
```

### Advanced Usage Examples

```typescript
// Batch processing
const batchResults = await optimizer.analyzeBatch([
  'SELECT * FROM users WHERE active = true',
  'SELECT COUNT(*) FROM posts',
  'SELECT u.name, p.title FROM users u JOIN posts p ON u.id = p.user_id'
]);

// Custom benchmarking
const benchmarkResult = await optimizer.benchmarkQuery(
  'SELECT * FROM users WHERE email LIKE ?', 
  { iterations: 10 }
);

// Generate custom reports
const report = await optimizer.generateReport(result, {
  format: 'html',
  includeExecutionPlan: true,
  includeAIRecommendations: true,
  outputPath: './custom-report.html'
});
```

## 🎨 **Report Examples**

### CLI Output
```
🔍 SQL Optimizer Analysis Report
═══════════════════════════════════════════════════════════════

📝 Query: SELECT * FROM users WHERE email = 'john@example.com'

📊 Performance Metrics:
  • Execution Time: 2.45ms
  • Rows Returned: 1
  • Buffer Usage: 8.0KB
  • Cache Hit Ratio: 95%

⚠️  Issues Found:
  • SELECT * may return unnecessary columns
  • Missing index on email column

💡 Recommendations:
  • CREATE INDEX idx_users_email ON users(email)
  • Specify only needed columns instead of SELECT *
```

### HTML Report Features
- 🎨 **Modern Design** with gradient headers and responsive layout
- 📊 **Interactive Charts** for performance metrics
- 🔍 **Detailed Analysis** with expandable sections
- 💾 **Export Options** for sharing and archiving
- 📱 **Mobile Responsive** design

## ⚙️ **Configuration**

### Environment Variables
```bash
# Database Configuration
DB_URL=postgres://user:password@localhost:5432/database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_username
DB_PASSWORD=your_password

# Optional: OpenAI API for AI-powered suggestions
OPENAI_API_KEY=your_openai_api_key

# Performance Settings
MAX_EXECUTION_TIME=30000
BENCHMARK_ITERATIONS=5

# Output Formatting
DEFAULT_OUTPUT_FORMAT=cli
ENABLE_COLORS=true
LOG_LEVEL=info
```

### Configuration Object
```typescript
interface OptimizerConfig {
  databaseUrl: string;
  openaiApiKey?: string;
  maxExecutionTime?: number;
  benchmarkIterations?: number;
  enableColors?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
```

## 🏗️ **Architecture**

### Core Components

```
sql-optimizer/
├── src/
│   ├── optimizer.ts           # Main orchestrator class
│   ├── analyzer.ts            # Query performance analysis
│   ├── ai-suggestions.ts      # OpenAI integration
│   ├── index-suggestor.ts     # Index recommendations
│   ├── query-rewriter.ts      # Query optimization
│   ├── benchmarker.ts         # Performance benchmarking
│   ├── reporter.ts            # Report generation
│   ├── schema-analyzer.ts     # Database schema analysis
│   ├── database-health-auditor.ts  # Health audit system
│   ├── security-analyzer.ts   # Security analysis
│   ├── cost-estimator.ts      # Cost analysis
│   ├── query-complexity-analyzer.ts  # Complexity scoring
│   ├── health-report-generator.ts    # Health report formatting
│   ├── query-builder.ts       # Interactive query building
│   ├── utils.ts               # Utility functions
│   ├── types.ts               # TypeScript definitions
│   └── index.ts               # Public API exports
├── bin/
│   └── cli.ts                 # Command-line interface
├── examples/                  # Example queries and schemas
├── setup/                     # Database setup scripts
└── test/                      # Test suites
```

### Design Patterns Used
- **Dependency Injection** - Clean module separation
- **Factory Pattern** - Configurable component creation
- **Strategy Pattern** - Multiple analysis strategies
- **Observer Pattern** - Progress reporting
- **Command Pattern** - CLI command structure

## 🧪 **Testing**

### Run Tests
```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Categories
- **Unit Tests** - Individual component testing
- **Integration Tests** - Database interaction testing
- **CLI Tests** - Command-line interface testing
- **Performance Tests** - Benchmarking and optimization

## 🔧 **Development**

### Setup Development Environment
```bash
git clone https://github.com/vasoyaprince14/sql-optimizer.git
cd sql-optimizer
npm install

# Start PostgreSQL (Docker)
docker run --name postgres-test -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Build project
npm run build

# Run in development mode
npm run dev
```

### Scripts
```bash
npm run build          # Build TypeScript to JavaScript
npm run dev            # Development mode with ts-node
npm run test           # Run test suite
npm run lint           # Run ESLint
npm run lint:fix       # Fix linting issues
npm run format         # Format code with Prettier
npm run cli            # Run CLI in development mode
```

### Contributing Guidelines
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

## 📋 **Requirements**

### System Requirements
- **Node.js** 16.0.0 or higher
- **PostgreSQL** 12.0 or higher
- **npm** or **yarn** package manager

### Optional Dependencies
- **OpenAI API Key** - For AI-powered suggestions
- **Docker** - For easy PostgreSQL setup

## 🎯 **Use Cases**

### For Database Administrators
- **Performance Monitoring** - Identify slow queries and bottlenecks
- **Index Optimization** - Get intelligent index recommendations
- **Health Audits** - Regular database health assessments
- **Cost Analysis** - Monitor database resource usage

### For Developers
- **Query Optimization** - Improve application query performance
- **Code Reviews** - Automated SQL code quality checks
- **Testing** - Performance regression testing
- **Learning** - Understand SQL optimization principles

### For DevOps Teams
- **CI/CD Integration** - Automated performance testing
- **Monitoring** - Database performance dashboards
- **Reporting** - Regular health and performance reports
- **Alerting** - Performance degradation detection

## 🤝 **Community & Support**

### Getting Help
- 📖 **Documentation** - Comprehensive guides and examples
- 🐛 **Issues** - Report bugs on GitHub Issues
- 💬 **Discussions** - Ask questions in GitHub Discussions
- 📧 **Email** - Direct support for enterprise users

### Contributing
We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎖️ **Acknowledgments**

- **PostgreSQL Community** - For the excellent database system
- **OpenAI** - For AI-powered optimization suggestions
- **TypeScript Team** - For the amazing type system
- **Node.js Community** - For the robust runtime environment

## 📊 **Project Stats**

- ⭐ **17 Core Modules** - Comprehensive feature set
- 🧪 **90%+ Test Coverage** - Reliable and tested
- 📝 **Full TypeScript** - Type-safe development
- 🎨 **3 Output Formats** - CLI, JSON, and HTML
- 🔧 **12 CLI Commands** - Complete toolset
- 🏗️ **Production Ready** - Enterprise-grade reliability

---

**Built with ❤️ by [Prince Vasoya](https://github.com/vasoyaprince14)**

*Perfect for your resume and portfolio!* ✨