# 🚀 SQL Optimizer - Quick Start Guide

Get up and running with SQL Optimizer in minutes!

## 📋 Prerequisites

- Node.js 16+ 
- PostgreSQL database
- npm or yarn

## ⚡ Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment
```bash
cp env.example .env
# Edit .env with your database connection
```

### 3. Build the Project
```bash
npm run build
```

### 4. Test the Installation
```bash
npm run cli -- test
```

## 🎯 Basic Usage

### Analyze a Single Query
```bash
# From file
npm run cli -- analyze -f examples/sample.sql

# Direct query
npm run cli -- analyze -q "SELECT * FROM users WHERE email = 'test@example.com'"
```

### Analyze with AI Suggestions
```bash
npm run cli -- analyze -f examples/sample.sql -a
```

### Generate HTML Report
```bash
npm run cli -- analyze -f examples/sample.sql -o html
```

### Analyze Database Schema
```bash
npm run cli -- schema
```

### Benchmark Query Performance
```bash
npm run cli -- benchmark -f examples/sample.sql
```

## 🔧 Configuration

Edit `.env` file:
```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# AI Configuration (Optional)
OPENAI_API_KEY=your_openai_api_key_here

# Performance Settings
MAX_EXECUTION_TIME=30000
BENCHMARK_ITERATIONS=5
```

## 📊 Example Output

```
🔍 SQL Optimizer Analysis Report
═══════════════════════════════════════════════════════════════

📝 Query:
SELECT * FROM users WHERE email = 'test@example.com'

📊 Performance Metrics:
  • Execution Time: 245ms
  • Rows Returned: 1,234
  • Buffer Usage: 8.2MB
  • Cache Hit Ratio: 85%

⚠️  Performance Issues:
  • Sequential scan detected on users table
  • Missing index on email column

💡 Suggestions:
  • Create index: CREATE INDEX idx_users_email ON users(email);
  • Consider adding WHERE clause to limit results

🧠 AI Recommendations:
  • Query can be optimized by adding composite index on (status, created_at)
  • Consider using EXISTS instead of IN for better performance
```

## 🛠️ Development

### Run Tests
```bash
npm test
```

### Run in Development Mode
```bash
npm run dev
```

### Lint Code
```bash
npm run lint
```

### Format Code
```bash
npm run format
```

## 📦 Publishing to npm

### 1. Build the Package
```bash
npm run build
```

### 2. Test the Build
```bash
npm test
npm run lint
```

### 3. Publish
```bash
npm login
npm publish
```

## 🎯 Next Steps

1. **Set up your database** with the sample schema in `examples/schema.sql`
2. **Test with your own queries** using the CLI
3. **Enable AI suggestions** by adding your OpenAI API key
4. **Customize the tool** for your specific needs
5. **Contribute** to the project!

## 🆘 Need Help?

- 📖 Read the full [README.md](README.md)
- 🐛 Report issues on GitHub
- 💬 Ask questions in discussions

---

**Happy optimizing! 🚀** 