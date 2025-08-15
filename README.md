# SQL Analyzer 🚀

[![npm version](https://img.shields.io/npm/v/@vasoyaprince14/sql-analyzer.svg)](https://www.npmjs.com/package/@vasoyaprince14/sql-analyzer)
[![npm downloads](https://img.shields.io/npm/dm/@vasoyaprince14/sql-analyzer.svg)](https://www.npmjs.com/package/@vasoyaprince14/sql-analyzer)
[![License](https://img.shields.io/npm/l/@vasoyaprince14/sql-analyzer.svg)](https://github.com/vasoyaprince14/sql-optimizer/blob/main/LICENSE)

**Enhanced Database Health Analyzer with AI-Powered Insights, Multi-Database Support, and Enterprise Features**

A comprehensive tool for analyzing database health, performance, security, and compliance across multiple database types including PostgreSQL, MySQL, SQL Server, and Oracle.

## ✨ Features

### 🔍 **Core Analysis**
- **Comprehensive Health Audits** - Schema, performance, security, and cost analysis
- **AI-Powered Insights** - OpenAI integration for intelligent recommendations
- **Multi-Database Support** - PostgreSQL, MySQL, SQL Server, Oracle
- **Real-time Performance Metrics** - Query analysis, index usage, connection monitoring
- **Security Vulnerability Detection** - Access control, encryption, compliance checks

### 📊 **Advanced Reporting**
- **Multiple Formats** - HTML, CLI, JSON, Markdown, CSV, XML
- **Executive Dashboards** - Business-focused insights and ROI calculations
- **Trend Analysis** - Compare runs and track improvements over time
- **Compliance Reports** - SOX, GDPR, HIPAA, PCI-DSS, SOC2 frameworks
- **Custom Branding** - Company logos, colors, and professional presentation

### 🚀 **Enterprise Features**
- **Monitoring & Alerting** - Automated health checks with Slack/email notifications
- **CI/CD Integration** - Quality gates, regression detection, SARIF output
- **External Integrations** - Jira, Slack, Datadog, Prometheus
- **Backup & Recovery Analysis** - Backup compliance and RPO assessment
- **Migration Planning** - Database upgrade and optimization roadmaps

### 🛡️ **Quality Gates**
- **Fail on Critical Issues** - Exit with error codes for CI/CD pipelines
- **Minimum Health Scores** - Enforce quality standards
- **Regression Detection** - Compare against baseline reports
- **Performance Thresholds** - Alert on performance degradation

## 🗄️ Supported Databases

| Database | Status | Features | Driver Required |
|----------|--------|----------|-----------------|
| **PostgreSQL** | ✅ Full Support | All features | Built-in (`pg`) |
| **MySQL/MariaDB** | ✅ Full Support | All features | `mysql2` |
| **SQL Server** | ✅ Full Support | All features | `mssql` |
| **Oracle** | ✅ Full Support | All features | `oracledb` |
| **SQLite** | 🚧 Coming Soon | Basic analysis | Built-in |

## 🚀 Quick Start

### Installation

```bash
npm install -g @vasoyaprince14/sql-analyzer
```

### Basic Usage

```bash
# Auto-detect database type and analyze
sql-analyzer detect -c "postgresql://user:pass@localhost/db"

# Comprehensive health audit
sql-analyzer health -c "postgresql://user:pass@localhost/db"

# Interactive setup wizard
sql-analyzer setup
```

## 📚 CLI Commands

### 🔍 **Health Audit** (Main Command)
```bash
sql-analyzer health [options]
```

**Options:**
- `-c, --connection <url>` - Database connection string
- `-f, --format <format>` - Output format (cli, html, json, md, csv, xml)
- `-o, --output <path>` - Output directory
- `--ai` - Enable AI-powered insights
- `--trend` - Show deltas vs last run
- `--baseline <path>` - Compare against previous report
- `--export-sql` - Export SQL fix scripts
- `--preflight` - Run connection tests only
- `--sarif <path>` - Generate SARIF for code scanning
- `--summary-dir <dir>` - Save summary files
- `--github-summary` - Write to GitHub Actions step summary

### 🔍 **Database Detection**
```bash
sql-analyzer detect [options]
```

**Options:**
- `-c, --connection <url>` - Database connection string
- `--test-connection` - Test connection after detection

**Example:**
```bash
sql-analyzer detect -c "mysql://user:pass@localhost/db" --test-connection
```

### 📊 **Monitoring Setup**
```bash
sql-analyzer monitor [options]
```

**Options:**
- `-c, --connection <url>` - Database connection string
- `--enable-metrics` - Enable performance metrics collection
- `--enable-alerts` - Enable alerting
- `--slack-webhook <url>` - Slack webhook for alerts
- `--email <email>` - Email for alerts
- `--threshold <number>` - Alert threshold percentage

**Example:**
```bash
sql-analyzer monitor -c "$DATABASE_URL" --enable-metrics --slack-webhook "$SLACK_WEBHOOK"
```

### 🔒 **Compliance Audit**
```bash
sql-analyzer compliance [options]
```

**Options:**
- `-c, --connection <url>` - Database connection string
- `-f, --framework <framework>` - Compliance framework (SOX, GDPR, HIPAA, PCI-DSS, SOC2)
- `--format <format>` - Report format
- `--output <path>` - Output directory

**Example:**
```bash
sql-analyzer compliance -c "$DATABASE_URL" -f GDPR --format html
```

### 🔗 **Integration Management**
```bash
sql-analyzer integrate [options]
```

**Options:**
- `--jira <url>` - Jira server URL
- `--jira-token <token>` - Jira API token
- `--slack-webhook <url>` - Slack webhook URL
- `--datadog-key <key>` - Datadog API key
- `--test` - Test integrations after setup

**Example:**
```bash
sql-analyzer integrate --jira "https://company.atlassian.net" --jira-token "$JIRA_TOKEN" --test
```

## 🔧 Configuration

### Environment Variables
```bash
export DATABASE_URL="postgresql://user:pass@localhost/db"
export OPENAI_API_KEY="your-openai-key"
export OPENAI_MODEL="gpt-4o"
```

### Configuration File (`sql-analyzer.config.json`)
```json
{
  "database": {
    "type": "postgresql",
    "connectionString": "postgresql://user:pass@localhost/db"
  },
  "ai": {
    "enabled": true,
    "provider": "openai",
    "apiKey": "your-key",
    "model": "gpt-4o"
  },
  "analysis": {
    "securityLevel": "strict",
    "includeCompliance": true
  },
  "monitoring": {
    "enabled": true,
    "alerting": {
      "enabled": true,
      "channels": ["slack", "email"]
    }
  }
}
```

### Configuration Presets
```bash
# Development environment
sql-analyzer health -c "$DATABASE_URL" --preset development

# Production with strict security
sql-analyzer health -c "$DATABASE_URL" --preset production

# CI/CD pipeline
sql-analyzer health -c "$DATABASE_URL" --preset ci

# Comprehensive analysis
sql-analyzer health -c "$DATABASE_URL" --preset comprehensive
```

## 🚀 Advanced Usage

### CI/CD Integration
```bash
# GitHub Actions
sql-analyzer health -c "$DATABASE_URL" \
  --format json \
  --fail-on-critical \
  --min-score 7.0 \
  --sarif ./reports/sql-analyzer.sarif \
  --github-summary
```

### Monitoring & Alerting
```bash
# Set up monitoring
sql-analyzer monitor -c "$DATABASE_URL" \
  --enable-metrics \
  --enable-alerts \
  --slack-webhook "$SLACK_WEBHOOK" \
  --threshold 85

# Run with monitoring
sql-analyzer health -c "$DATABASE_URL" \
  --monitor \
  --notify-webhook "$SLACK_WEBHOOK" \
  --notify-on regression
```

### Compliance & Governance
```bash
# SOX compliance audit
sql-analyzer compliance -c "$DATABASE_URL" \
  -f SOX \
  --format html \
  --output ./compliance-reports

# GDPR compliance with custom config
sql-analyzer compliance -c "$DATABASE_URL" \
  -f GDPR \
  --format json \
  --output ./gdpr-audit
```

### Multi-Database Analysis
```bash
# PostgreSQL
sql-analyzer health -c "postgresql://user:pass@localhost/pgdb"

# MySQL
sql-analyzer health -c "mysql://user:pass@localhost/mysqldb"

# SQL Server
sql-analyzer health -c "mssql://user:pass@localhost/sqldb"

# Oracle
sql-analyzer health -c "oracle://user:pass@localhost/oracledb"
```

## 📊 Report Examples

### CLI Output
```
📊 ANALYSIS SUMMARY
════════════════════════════════════════════════════════════════
Overall Health Score: 7.8/10
Total Issues: 12
Critical Issues: 2
Security Risk: MEDIUM
Performance Risk: LOW
Overall Risk: MEDIUM
Monthly Savings Potential: $2,450
Implementation Time: 2-3 weeks

🎯 TOP RECOMMENDATIONS
────────────────────────────────────────────────────────────────
1. Create missing indexes on frequently queried columns
2. Implement connection pooling to reduce connection overhead
3. Enable SSL encryption for all database connections
4. Set up automated backup verification
5. Configure query performance monitoring
```

### HTML Report
- Interactive dashboards with charts
- Detailed issue breakdowns
- Implementation guides with SQL scripts
- Executive summary with ROI calculations
- Compliance checklists and recommendations

### JSON Report
- Machine-readable format for CI/CD
- Structured data for custom integrations
- Trend analysis data
- Performance metrics and benchmarks

## 🔌 Integrations

### **Monitoring & Alerting**
- **Slack** - Real-time notifications and alerts
- **Email** - Scheduled reports and critical alerts
- **Webhooks** - Custom integrations and automation
- **PagerDuty** - Incident management and escalation

### **Development Tools**
- **Jira** - Issue tracking and project management
- **GitHub Actions** - CI/CD pipeline integration
- **GitLab CI** - Automated testing and deployment
- **Jenkins** - Build automation and monitoring

### **Observability Platforms**
- **Datadog** - Metrics collection and visualization
- **Prometheus** - Time-series data and alerting
- **Grafana** - Dashboard creation and monitoring
- **New Relic** - Application performance monitoring

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Database access (PostgreSQL, MySQL, SQL Server, Oracle)

### Installation
```bash
git clone https://github.com/vasoyaprince14/sql-optimizer.git
cd sql-optimizer
npm install
npm run build
```

### Testing
```bash
npm test
npm run lint
npm run type-check
```

### Building
```bash
npm run build
npm run build:watch
```

## 📈 Roadmap

### **v1.4.0** (Coming Soon)
- [ ] SQLite support
- [ ] MongoDB and Redis analysis
- [ ] Advanced query optimization
- [ ] Machine learning-based recommendations
- [ ] Real-time monitoring dashboard

### **v1.5.0** (Planned)
- [ ] Cloud database support (AWS RDS, Azure SQL, GCP Cloud SQL)
- [ ] Container and Kubernetes integration
- [ ] Advanced compliance frameworks
- [ ] Custom rule engine
- [ ] API endpoints for programmatic access

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [Full Documentation](https://github.com/vasoyaprince14/sql-optimizer)
- [Examples](https://github.com/vasoyaprince14/sql-optimizer/tree/main/examples)
- [Configuration Guide](https://github.com/vasoyaprince14/sql-optimizer/blob/main/docs/configuration.md)

### Issues & Questions
- [GitHub Issues](https://github.com/vasoyaprince14/sql-optimizer/issues)
- [Discussions](https://github.com/vasoyaprince14/sql-optimizer/discussions)

### Community
- [GitHub Discussions](https://github.com/vasoyaprince14/sql-optimizer/discussions)
- [Contributing Guide](CONTRIBUTING.md)

---

**Made with ❤️ by the SQL Analyzer Team**

Transform your database health monitoring with AI-powered insights and enterprise-grade features!