#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import ora from 'ora';
import * as fs from 'fs-extra';
import * as path from 'path';
import { SQLOptimizer } from '../src/optimizer';
import { QueryBuilder } from '../src/query-builder';
import { OptimizerConfig } from '../src/types';

const program = new Command();

// ASCII Art Banner
console.log(chalk.blue(figlet.textSync('SQL Optimizer', { horizontalLayout: 'full' })));
console.log(chalk.gray('A powerful tool for SQL query optimization and performance analysis\n'));

program
  .name('sqlopt')
  .description('SQL Optimizer CLI - Analyze and optimize your SQL queries')
  .version('0.1.0');

// Global options
program
  .option('-d, --database <url>', 'Database connection URL')
  .option('-o, --output <format>', 'Output format (cli, json, html)', 'cli')
  .option('-v, --verbose', 'Verbose output')
  .option('--no-colors', 'Disable colored output');

// Analyze command
program
  .command('analyze')
  .description('Analyze a SQL query or file')
  .option('-f, --file <path>', 'SQL file to analyze')
  .option('-q, --query <sql>', 'Direct SQL query to analyze')
  .option('-a, --ai', 'Enable AI-powered suggestions')
  .option('-i, --indexes', 'Generate index suggestions')
  .option('-r, --rewrite', 'Suggest query rewrites')
  .action(async (options) => {
    const spinner = ora('Analyzing SQL query...').start();
    
    try {
      const config = await getConfig();
      const optimizer = new SQLOptimizer(config);
      
      await optimizer.connect();
      
      let sql: string;
      if (options.file) {
        sql = await fs.readFile(options.file, 'utf-8');
      } else if (options.query) {
        sql = options.query;
      } else {
        spinner.fail('No SQL provided. Use -f or -q option.');
        process.exit(1);
      }
      
      const result = await optimizer.analyzeQuery(sql, options.ai);
      
      spinner.succeed('Analysis completed!');
      
      // Generate report
      const report = await optimizer.generateReport(result, {
        format: options.output as any,
        includeAIRecommendations: options.ai
      });
      
      console.log(report);
      
      await optimizer.disconnect();
    } catch (error) {
      spinner.fail(`Analysis failed: ${error}`);
      process.exit(1);
    }
  });

// Schema command
program
  .command('schema')
  .description('Analyze database schema')
  .option('-o, --output <format>', 'Output format (cli, json, html)', 'cli')
  .action(async (options) => {
    const spinner = ora('Analyzing database schema...').start();
    
    try {
      const config = await getConfig();
      const optimizer = new SQLOptimizer(config);
      
      await optimizer.connect();
      
      const result = await optimizer.analyzeSchema();
      
      spinner.succeed('Schema analysis completed!');
      
      // Generate report
      const report = await optimizer.generateReport(result as any, {
        format: options.output as any
      });
      
      console.log(report);
      
      await optimizer.disconnect();
    } catch (error) {
      spinner.fail(`Schema analysis failed: ${error}`);
      process.exit(1);
    }
  });

// Benchmark command
program
  .command('benchmark')
  .description('Benchmark query performance')
  .option('-f, --file <path>', 'SQL file to benchmark')
  .option('-q, --query <sql>', 'Direct SQL query to benchmark')
  .option('-i, --iterations <number>', 'Number of iterations', '5')
  .action(async (options) => {
    const spinner = ora('Benchmarking query...').start();
    
    try {
      const config = await getConfig();
      const optimizer = new SQLOptimizer(config);
      
      await optimizer.connect();
      
      let sql: string;
      if (options.file) {
        sql = await fs.readFile(options.file, 'utf-8');
      } else if (options.query) {
        sql = options.query;
      } else {
        spinner.fail('No SQL provided. Use -f or -q option.');
        process.exit(1);
      }
      
      const iterations = parseInt(options.iterations);
      const result = await optimizer.benchmarkQuery(sql, iterations);
      
      spinner.succeed('Benchmark completed!');
      
      // Display benchmark results
      displayBenchmarkResults(result);
      
      await optimizer.disconnect();
    } catch (error) {
      spinner.fail(`Benchmark failed: ${error}`);
      process.exit(1);
    }
  });

// Batch command
program
  .command('batch')
  .description('Analyze multiple queries in batch')
  .option('-f, --file <path>', 'File containing multiple SQL queries (one per line)')
  .option('-a, --ai', 'Enable AI-powered suggestions')
  .option('-o, --output <format>', 'Output format (cli, json, html)', 'cli')
  .action(async (options) => {
    const spinner = ora('Analyzing queries in batch...').start();
    
    try {
      const config = await getConfig();
      const optimizer = new SQLOptimizer(config);
      
      await optimizer.connect();
      
      if (!options.file) {
        spinner.fail('No file provided. Use -f option.');
        process.exit(1);
      }
      
      const content = await fs.readFile(options.file, 'utf-8');
      
      // Parse SQL queries properly (handle multi-line queries)
      const cleanSQL = content
        .split('\n')
        .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
        .join('\n');
      
      const queries = cleanSQL
        .split(';')
        .map(query => query.trim().replace(/\s+/g, ' '))
        .filter(query => query.length > 0);
      
      const result = await optimizer.analyzeBatch(queries, options.ai);
      
      spinner.succeed(`Batch analysis completed! Analyzed ${result.summary.totalQueries} queries.`);
      
      // Generate report
      const report = await optimizer.generateReport(result, {
        format: options.output as any,
        includeAIRecommendations: options.ai
      });
      
      console.log(report);
      
      await optimizer.disconnect();
    } catch (error) {
      spinner.fail(`Batch analysis failed: ${error}`);
      process.exit(1);
    }
  });

// Info command
program
  .command('info')
  .description('Show database information')
  .action(async () => {
    const spinner = ora('Getting database information...').start();
    
    try {
      const config = await getConfig();
      const optimizer = new SQLOptimizer(config);
      
      await optimizer.connect();
      
      const info = await optimizer.getDatabaseInfo();
      
      spinner.succeed('Database information retrieved!');
      
      displayDatabaseInfo(info);
      
      await optimizer.disconnect();
    } catch (error) {
      spinner.fail(`Failed to get database info: ${error}`);
      process.exit(1);
    }
  });

// Comprehensive analysis command
program
  .command('comprehensive')
  .description('Run comprehensive analysis with all features')
  .option('-f, --file <path>', 'SQL file to analyze')
  .option('-q, --query <sql>', 'Direct SQL query to analyze')
  .option('-a, --ai', 'Enable AI-powered suggestions')
  .action(async (options) => {
    const spinner = ora('Running comprehensive analysis...').start();
    
    try {
      const config = await getConfig();
      const optimizer = new SQLOptimizer(config);
      
      await optimizer.connect();
      
      let sql: string;
      if (options.file) {
        const fileContent = await fs.readFile(options.file, 'utf-8');
        
        // Parse multiple queries from file and use the first non-comment query
        const cleanSQL = fileContent
          .split('\n')
          .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
          .join('\n');
        
        const queries = cleanSQL
          .split(';')
          .map(query => query.trim().replace(/\s+/g, ' '))
          .filter(query => query.length > 0);
        
        if (queries.length === 0) {
          spinner.fail('No valid SQL queries found in file.');
          process.exit(1);
        }
        
        // Use the first query for comprehensive analysis
        sql = queries[0];
        
        if (queries.length > 1) {
          console.log(`\n📝 Found ${queries.length} queries in file. Analyzing the first one.`);
          console.log('💡 Use batch analysis for multiple queries: npm run cli -- batch -f ' + options.file);
        }
      } else if (options.query) {
        sql = options.query;
        // Handle common quote issues
        if (sql.startsWith('"') && sql.endsWith('"')) {
          sql = sql.slice(1, -1);
        }
        if (sql.startsWith("'") && sql.endsWith("'")) {
          sql = sql.slice(1, -1);
        }
      } else {
        spinner.fail('No SQL provided. Use -f or -q option.');
        console.log('\n💡 Examples:');
        console.log('  npm run cli -- comprehensive -q "SELECT * FROM users"');
        console.log('  npm run cli -- comprehensive -f examples/sample.sql');
        process.exit(1);
      }
      
      // Validate SQL is not empty
      if (!sql.trim()) {
        spinner.fail('Empty SQL query provided.');
        process.exit(1);
      }
      
      console.log(`\n🔍 Analyzing query: ${chalk.cyan(sql.substring(0, 100))}${sql.length > 100 ? '...' : ''}`);
      spinner.text = 'Running comprehensive analysis...';
      
      const result = await optimizer.generateComprehensiveAnalysis(sql);
      
      spinner.succeed('Comprehensive analysis completed!');
      
      // Display all reports
      console.log(result.complexity);
      console.log(result.cost);
      console.log(result.security);
      
      // Generate main performance report
      const report = await optimizer.generateReport(result.performance, {
        format: 'cli',
        includeAIRecommendations: options.ai
      });
      
      console.log(report);
      
      await optimizer.disconnect();
    } catch (error) {
      spinner.fail(`Comprehensive analysis failed: ${error}`);
      console.log('\n💡 Troubleshooting:');
      console.log('  • Check if your query syntax is valid');
      console.log('  • Ensure all referenced tables exist');
      console.log('  • Try running: npm run cli -- test');
      console.log('  • Use demo mode: npm run cli -- demo');
      process.exit(1);
    }
  });

// Setup database command
program
  .command('setup')
  .description('Set up sample database tables and data for testing')
  .action(async () => {
    const spinner = ora('Setting up database...').start();
    
    try {
      const config = await getConfig();
      const optimizer = new SQLOptimizer(config);
      
      await optimizer.connect();
      
      // Read and execute setup script
      const setupSQL = await fs.readFile('setup/database-setup.sql', 'utf-8');
      const statements = setupSQL.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        if (statement.trim()) {
          await optimizer['client'].query(statement.trim());
        }
      }
      
      spinner.succeed('Database setup completed successfully!');
      console.log('\n🎉 Sample tables and data created:');
      console.log('  • users (5 records)');
      console.log('  • posts (5 records)');
      console.log('  • comments (5 records)');
      console.log('  • categories (4 records)');
      console.log('  • products (5 records)');
      console.log('  • orders (4 records)');
      console.log('  • order_items (7 records)');
      console.log('\n📊 Ready for analysis! Try:');
      console.log('  npm run cli -- analyze -q "SELECT * FROM users"');
      console.log('  npm run cli -- comprehensive -f examples/sample.sql');
      
      await optimizer.disconnect();
    } catch (error) {
      spinner.fail(`Database setup failed: ${error}`);
      console.log('\n💡 Make sure your database is running and accessible.');
      process.exit(1);
    }
  });

// Database health audit command
program
  .command('health')
  .description('Comprehensive database health audit and optimization report')
  .option('-o, --output <format>', 'Output format (cli, json, html)', 'cli')
  .option('--save <file>', 'Save report to file')
  .action(async (options) => {
    const spinner = ora('Performing comprehensive database health audit...').start();
    
    try {
      const config = await getConfig();
      const optimizer = new SQLOptimizer(config);
      
      await optimizer.connect();
      
      const report = await optimizer.performHealthAudit(options.output);
      
      spinner.succeed('Database health audit completed!');
      
      if (options.save) {
        await fs.writeFile(options.save, report);
        console.log(`\n💾 Report saved to: ${chalk.cyan(options.save)}`);
      } else {
        console.log(report);
      }
      
      await optimizer.disconnect();
    } catch (error) {
      spinner.fail(`Health audit failed: ${error}`);
      console.log('\n💡 Make sure your database is running and accessible.');
      process.exit(1);
    }
  });

// Query builder command
program
  .command('build')
  .description('Interactive query builder with optimization suggestions')
  .option('-t, --table <name>', 'Table name to build query for')
  .action(async (options) => {
    const spinner = ora('Connecting to database...').start();
    
    try {
      const config = await getConfig();
      const optimizer = new SQLOptimizer(config);
      const queryBuilder = new QueryBuilder(optimizer['client']);
      
      await optimizer.connect();
      spinner.succeed('Connected to database!');
      
      let tableName = options.table;
      
      if (!tableName) {
        // Show available tables
        const tables = await queryBuilder.getAvailableTables();
        console.log('\n📋 Available Tables:');
        tables.forEach((table, index) => {
          console.log(`  ${index + 1}. ${table}`);
        });
        
        console.log('\n💡 Usage: npm run cli -- build -t <table_name>');
        console.log('Example: npm run cli -- build -t users');
        
        await optimizer.disconnect();
        return;
      }
      
      // Get table columns
      const columns = await queryBuilder.getAvailableColumns(tableName);
      if (columns.length === 0) {
        console.log(`❌ Table '${tableName}' not found or has no columns.`);
        await optimizer.disconnect();
        return;
      }
      
      console.log(`\n📊 Table: ${chalk.blue(tableName)}`);
      console.log('📋 Available Columns:');
      columns.forEach(col => {
        console.log(`  • ${chalk.green(col.name)} (${chalk.gray(col.type)})`);
      });
      
      // Generate suggested queries
      const suggestions = await queryBuilder.suggestQueries(tableName);
      console.log('\n💡 Suggested Queries:');
      suggestions.forEach((query, index) => {
        console.log(`\n${index + 1}. ${chalk.yellow(query)}`);
      });
      
      // Build example optimized query
      const example = await queryBuilder.buildQuery({
        table: tableName,
        columns: columns.slice(0, 3).map(c => c.name),
        limit: 10
      });
      
      console.log('\n🔧 Example Optimized Query:');
      console.log(chalk.cyan(example.sql));
      console.log(`\n📝 Explanation: ${example.explanation}`);
      
      if (example.optimizationTips.length > 0) {
        console.log('\n💡 Optimization Tips:');
        example.optimizationTips.forEach(tip => {
          console.log(`  • ${tip}`);
        });
      }
      
      await optimizer.disconnect();
    } catch (error) {
      spinner.fail(`Query builder failed: ${error}`);
      process.exit(1);
    }
  });

// Demo command
program
  .command('demo')
  .description('Run a demo analysis without database')
  .action(async () => {
    console.log(chalk.blue('\n🎯 SQL Optimizer Demo'));
    console.log(chalk.gray('═══════════════════════════════════════════════════════════════\n'));
    
    const demoQuery = "SELECT * FROM users WHERE email = 'test@example.com'";
    console.log(chalk.white('📝 Demo Query:'));
    console.log(chalk.gray(demoQuery) + '\n');
    
    console.log(chalk.blue('📊 Demo Performance Metrics:'));
    console.log(chalk.white('  • Execution Time: 245ms'));
    console.log(chalk.white('  • Rows Returned: 1,234'));
    console.log(chalk.white('  • Buffer Usage: 8.2MB'));
    console.log(chalk.white('  • Cache Hit Ratio: 85%\n'));
    
    console.log(chalk.red('⚠️  Demo Performance Issues:'));
    console.log(chalk.red('  • Sequential scan detected on users table'));
    console.log(chalk.red('  • Missing index on email column\n'));
    
    console.log(chalk.green('💡 Demo Suggestions:'));
    console.log(chalk.green('  • Create index: CREATE INDEX idx_users_email ON users(email);'));
    console.log(chalk.green('  • Consider adding WHERE clause to limit results\n'));
    
    console.log(chalk.magenta('🧠 Demo AI Recommendations:'));
    console.log(chalk.magenta('  • Query can be optimized by adding composite index on (status, created_at)'));
    console.log(chalk.magenta('  • Consider using EXISTS instead of IN for better performance\n'));
    
    console.log(chalk.blue('🎯 To use with real database:'));
    console.log(chalk.white('1. Install PostgreSQL: brew install postgresql'));
    console.log(chalk.white('2. Start PostgreSQL: brew services start postgresql'));
    console.log(chalk.white('3. Create database: createdb taout'));
    console.log(chalk.white('4. Run: npm run cli -- analyze -q "SELECT * FROM users"'));
  });

// Test command
program
  .command('test')
  .description('Test database connection')
  .action(async () => {
    const spinner = ora('Testing database connection...').start();
    
    try {
      const config = await getConfig();
      const optimizer = new SQLOptimizer(config);
      
      const isValid = await optimizer.validateConnection();
      
      if (isValid) {
        spinner.succeed('Database connection successful!');
      } else {
        spinner.fail('Database connection failed!');
        console.log('\n💡 To fix this:');
        console.log('1. Install PostgreSQL: brew install postgresql');
        console.log('2. Start PostgreSQL: brew services start postgresql');
        console.log('3. Create database: createdb taout');
        console.log('4. Or update DATABASE_URL in .env file');
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(`Connection test failed: ${error}`);
      console.log('\n💡 To fix this:');
      console.log('1. Install PostgreSQL: brew install postgresql');
      console.log('2. Start PostgreSQL: brew services start postgresql');
      console.log('3. Create database: createdb taout');
      console.log('4. Or update DATABASE_URL in .env file');
      process.exit(1);
    }
  });

// Helper functions
async function getConfig(): Promise<OptimizerConfig> {
  const options = program.opts();
  
  let databaseUrl = options.database || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error(chalk.red('Error: Database URL not provided.'));
    console.error(chalk.yellow('Use --database option or set DATABASE_URL environment variable.'));
    process.exit(1);
  }
  
  return {
    databaseUrl,
    openaiApiKey: process.env.OPENAI_API_KEY,
    enableColors: options.colors !== false,
    logLevel: options.verbose ? 'debug' : 'info'
  };
}

function displayBenchmarkResults(result: any) {
  console.log(chalk.blue('\n📊 Benchmark Results'));
  console.log(chalk.gray('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.white(`Query: ${result.query.substring(0, 50)}...`));
  console.log(chalk.white(`Iterations: ${result.iterations}`));
  console.log(chalk.green(`Average Time: ${result.averageTime.toFixed(2)}ms`));
  console.log(chalk.yellow(`Min Time: ${result.minTime.toFixed(2)}ms`));
  console.log(chalk.red(`Max Time: ${result.maxTime.toFixed(2)}ms`));
  console.log(chalk.cyan(`Standard Deviation: ${result.standardDeviation.toFixed(2)}ms`));
}

function displayDatabaseInfo(info: any) {
  console.log(chalk.blue('\n📊 Database Information'));
  console.log(chalk.gray('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.white(`Version: ${info.version}`));
  console.log(chalk.white(`Size: ${info.size}`));
  console.log(chalk.white(`Tables: ${info.tables}`));
}

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
} 