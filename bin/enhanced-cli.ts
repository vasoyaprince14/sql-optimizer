#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import ora from 'ora';
import inquirer from 'inquirer';
import * as fs from 'fs-extra';
import { EnhancedSQLAnalyzer, ConfigManager } from '../src/enhanced-sql-analyzer';
import OpenAI from 'openai';

const program = new Command();

// Enhanced ASCII Art Banner
console.log(chalk.blue(figlet.textSync('SQL Analyzer', { horizontalLayout: 'fitted' })));
console.log(chalk.magenta('🚀 Enhanced Database Health Analyzer with AI Insights\n'));

program
  .name('sql-analyzer')
  .description('Enhanced SQL Database Analyzer - Comprehensive health audits with AI-powered insights')
  .version('1.1.0');

// Global options
program
  .option('-c, --connection <url>', 'Database connection URL')
  .option('-f, --format <format>', 'Output format (cli, html, json)', 'html')
  .option('-o, --output <path>', 'Output directory path', './reports')
  .option('-v, --verbose', 'Verbose output')
  .option('--no-colors', 'Disable colored output')
  .option('--config <path>', 'Configuration file path')
  .option('--preset <preset>', 'Configuration preset (development, production, ci, comprehensive)')
  .option('--ai', 'Enable AI-powered insights')
  .option('--openai-key <key>', 'OpenAI API key for AI insights')
  .option('--openai-model <model>', 'OpenAI model (e.g., gpt-4o, gpt-4o-mini, gpt-4)');

// Health audit command (main feature)
program
  .command('health')
  .description('Perform comprehensive database health audit')
  .option('-c, --connection <url>', 'Database connection URL')
  .option('-f, --format <format>', 'Report format (cli, html, json)', 'html')
  .option('-o, --output <path>', 'Output directory', './reports')
  .option('--ai', 'Enable AI insights')
  .option('--openai-key <key>', 'OpenAI API key')
  .option('--openai-model <model>', 'OpenAI model (e.g., gpt-4o, gpt-4o-mini, gpt-4)')
  .option('--preset <preset>', 'Configuration preset')
  .option('--security-level <level>', 'Security analysis level (basic, standard, strict)', 'standard')
  .option('--fail-on-critical', 'Exit with error code if critical issues found')
  .option('--min-score <score>', 'Minimum health score required (0-10)', '0')
  .option('--progress', 'Show progress indicator')
  .action(async (options) => {
    const globalOptions = program.opts();
    const connectionUrl = options.connection || globalOptions.connection || process.env.DATABASE_URL;
    
    if (!connectionUrl) {
      console.error(chalk.red('❌ Database connection URL is required'));
      console.log(chalk.yellow('💡 Use -c option or set DATABASE_URL environment variable'));
      process.exit(1);
    }

    const format = options.format || globalOptions.format || 'html';
    const outputPath = options.output || globalOptions.output || './reports';
    const enableAI = options.ai || globalOptions.ai || false;
    const openaiKey = options.openaiKey || globalOptions.openaiKey || process.env.OPENAI_API_KEY;
    const openaiModel = options.openaiModel || globalOptions.openaiModel || process.env.OPENAI_MODEL;

    let spinner: any;
    
    if (!options.progress) {
      spinner = ora('🔍 Starting comprehensive database health audit...').start();
    }

    try {
      // Create analyzer with configuration
      const analyzer = new EnhancedSQLAnalyzer(
        { connectionString: connectionUrl },
        {
          format: format as any,
          outputPath,
          includeAI: enableAI,
          preset: options.preset ? options.preset as any : 'production',
          customConfig: {
            ai: {
              enabled: enableAI,
              apiKey: openaiKey,
              model: openaiModel
            },
            analysis: {
              securityLevel: options.securityLevel as any || 'standard'
            },
            advanced: {
              verbose: globalOptions.verbose || false
            }
          }
        }
      );

      // Perform analysis with optional progress monitoring
      const result = await analyzer.analyzeAndReport({
        returnReport: false,
        skipSave: false,
        onProgress: options.progress ? (step: string, progress: number) => {
          const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
          process.stdout.write(`\r${step.padEnd(40)} [${bar}] ${progress}%`);
          if (progress === 100) console.log(''); // New line when complete
        } : undefined
      });

      if (spinner) spinner.succeed('✅ Analysis completed successfully!');

      // Display summary
      const summary = result.summary;
      console.log('\n' + chalk.bold.blue('📊 ANALYSIS SUMMARY'));
      console.log(chalk.gray('═'.repeat(60)));
      
      // Health score with color coding
      const scoreColor = summary.overallScore >= 8 ? 'green' : summary.overallScore >= 6 ? 'yellow' : 'red';
      console.log(`Overall Health Score: ${chalk[scoreColor].bold(summary.overallScore.toFixed(1))}/10`);
      
      // Issue counts with color coding
      const criticalColor = summary.criticalIssues === 0 ? 'green' : 'red';
      const totalColor = summary.totalIssues === 0 ? 'green' : summary.totalIssues <= 5 ? 'yellow' : 'red';
      
      console.log(`Total Issues: ${chalk[totalColor](summary.totalIssues)}`);
      console.log(`Critical Issues: ${chalk[criticalColor].bold(summary.criticalIssues)}`);
      
      // Risk levels with color coding
      const getRiskColor = (risk: string) => {
        switch (risk) {
          case 'low': return 'green';
          case 'medium': return 'yellow';
          case 'high': return 'red';
          case 'critical': return 'red';
          default: return 'white';
        }
      };
      
      console.log(`Security Risk: ${chalk[getRiskColor(summary.securityRisk)](summary.securityRisk.toUpperCase())}`);
      console.log(`Performance Risk: ${chalk[getRiskColor(summary.performanceRisk)](summary.performanceRisk.toUpperCase())}`);
      console.log(`Overall Risk: ${chalk[getRiskColor(summary.riskLevel)].bold(summary.riskLevel.toUpperCase())}`);
      
      // Cost and time estimates
      console.log(`Monthly Savings Potential: ${chalk.green('$' + summary.costSavingsPotential.toFixed(0))}`);
      console.log(`Implementation Time: ${chalk.cyan(summary.estimatedImplementationTime)}`);

      // Top recommendations
      if (summary.topRecommendations.length > 0) {
        console.log('\n' + chalk.bold.yellow('🎯 TOP RECOMMENDATIONS'));
        console.log(chalk.gray('─'.repeat(60)));
        summary.topRecommendations.slice(0, 5).forEach((rec, index) => {
          console.log(`${chalk.cyan(index + 1)}. ${rec}`);
        });
      }

      console.log(`\n📄 Report saved to: ${chalk.cyan(result.reportPath)}`);

      // Check quality gates
      if (options.failOnCritical && summary.criticalIssues > 0) {
        console.log(chalk.red(`\n❌ Failing due to ${summary.criticalIssues} critical issues`));
        process.exit(1);
      }

      const minScore = parseFloat(options.minScore || '0');
      if (minScore > 0 && summary.overallScore < minScore) {
        console.log(chalk.red(`\n❌ Health score ${summary.overallScore} below minimum ${minScore}`));
        process.exit(1);
      }

      console.log(chalk.green('\n🎉 Database health audit completed successfully!'));

    } catch (error: any) {
      if (spinner) spinner.fail('❌ Analysis failed');
      console.error(chalk.red('\n💥 Error:'), error.message);
      
      // Provide helpful error messages
      if (error.message.includes('ECONNREFUSED')) {
        console.log(chalk.yellow('\n💡 Database connection failed. Please check:'));
        console.log('   • Database server is running');
        console.log('   • Connection URL is correct');
        console.log('   • Network connectivity');
      }
      
      if (error.message.includes('authentication failed')) {
        console.log(chalk.yellow('\n💡 Authentication failed. Please check:'));
        console.log('   • Username and password are correct');
        console.log('   • User has necessary permissions');
      }
      
      if (error.message.includes('OpenAI API key')) {
        console.log(chalk.yellow('\n💡 AI features require OpenAI API key:'));
        console.log('   • Set OPENAI_API_KEY environment variable');
        console.log('   • Or use --openai-key option');
        console.log('   • Or disable AI with --no-ai');
      }
      
      process.exit(1);
    }
  });

// Schema analysis command
program
  .command('schema')
  .description('Analyze database schema health')
  .option('-c, --connection <url>', 'Database connection URL')
  .option('-f, --format <format>', 'Output format (cli, json)', 'cli')
  .option('-t, --tables <tables>', 'Comma-separated list of tables to analyze')
  .action(async (options) => {
    // Implementation for schema-specific analysis
    console.log(chalk.blue('🔍 Schema analysis feature coming soon...'));
    console.log('For now, use the "health" command for comprehensive analysis including schema.');
  });

// Performance analysis command
program
  .command('performance')
  .description('Analyze database performance issues')
  .option('-c, --connection <url>', 'Database connection URL')
  .option('-f, --format <format>', 'Output format (cli, json)', 'cli')
  .option('--slow-queries', 'Analyze slow queries')
  .option('--bloat', 'Check for table bloat')
  .action(async (options) => {
    console.log(chalk.blue('🔍 Performance analysis feature coming soon...'));
    console.log('For now, use the "health" command for comprehensive analysis including performance.');
  });

// Interactive setup command
program
  .command('setup')
  .description('Interactive setup wizard')
  .action(async () => {
    console.log(chalk.blue('🛠️  Interactive Setup Wizard\n'));
    
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'analysisType',
        message: 'What would you like to analyze?',
        choices: [
          { name: 'Full Health Audit (recommended)', value: 'health' },
          { name: 'Schema Health (coming soon)', value: 'schema' },
          { name: 'Performance (coming soon)', value: 'performance' }
        ],
        default: 'health'
      },
      {
        type: 'input',
        name: 'connectionUrl',
        message: 'Database connection URL:',
        default: 'postgresql://postgres:password@localhost:5432/mydb'
      },
      {
        type: 'list',
        name: 'format',
        message: 'Preferred report format:',
        choices: ['html', 'cli', 'json'],
        default: 'html'
      },
      {
        type: 'input',
        name: 'outputPath',
        message: 'Output directory:',
        default: './reports'
      },
      {
        type: 'confirm',
        name: 'enableAI',
        message: 'Enable AI-powered insights?',
        default: false
      },
      {
        type: 'input',
        name: 'openaiKey',
        message: 'OpenAI API key (optional):',
        when: (answers) => answers.enableAI
      },
      {
        type: 'confirm',
        name: 'validateKey',
        message: 'Validate key and fetch available models?',
        default: true,
        when: (answers) => answers.enableAI && !!answers.openaiKey
      },
      {
        type: 'list',
        name: 'openaiModel',
        message: 'OpenAI model:',
        choices: async (answers: any) => {
          const fallback = ['gpt-4o', 'gpt-4o-mini', 'gpt-4'];
          if (!answers.enableAI || !answers.openaiKey) return fallback;
          if (answers.validateKey === false) return fallback;
          try {
            const client = new OpenAI({ apiKey: answers.openaiKey });
            const models = await client.models.list();
            const names = models.data.map(m => m.id).filter(id => /gpt-4|gpt-4o|mini|gpt-3\.5/i.test(id));
            return Array.from(new Set([...names, ...fallback]));
          } catch (e: any) {
            console.log(chalk.yellow(`⚠️  Could not fetch models (${e?.message || 'unknown error'}). Falling back to defaults.`));
            return fallback;
          }
        },
        default: 'gpt-4o',
        when: (answers) => answers.enableAI
      },
      {
        type: 'number',
        name: 'temperature',
        message: 'Creativity (temperature 0.0 - 1.0):',
        default: 0.2,
        when: (answers) => answers.enableAI
      },
      {
        type: 'list',
        name: 'securityLevel',
        message: 'Security analysis level:',
        choices: ['basic', 'standard', 'strict'],
        default: 'standard'
      }
    ]);

    // Create configuration file
    const config = {
      database: {
        connectionString: answers.connectionUrl
      },
      ai: {
        enabled: answers.enableAI,
        apiKey: answers.openaiKey || '',
        model: answers.openaiModel || undefined,
        temperature: typeof answers.temperature === 'number' ? answers.temperature : undefined
      },
      analysis: {
        securityLevel: answers.securityLevel
      },
      reporting: {
        format: answers.format,
        outputPath: answers.outputPath
      }
    };

    const configPath = './sql-analyzer.config.json';
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    console.log(chalk.green(`\n✅ Configuration saved to ${configPath}`));
    const { runNow } = await inquirer.prompt([{ type: 'confirm', name: 'runNow', message: 'Run analysis now?', default: true }]);
    if (runNow) {
      const spinner = ora('🔍 Running analysis...').start();
      try {
        const analyzer = new EnhancedSQLAnalyzer(
          { connectionString: answers.connectionUrl },
          {
            format: answers.format,
            outputPath: answers.outputPath,
            includeAI: answers.enableAI,
            preset: 'production',
            customConfig: {
              ai: { enabled: answers.enableAI, apiKey: answers.openaiKey, model: answers.openaiModel, temperature: answers.temperature },
              analysis: { securityLevel: answers.securityLevel }
            }
          }
        );
        const result = await analyzer.analyzeAndReport({});
        spinner.succeed('✅ Analysis completed');
        console.log(chalk.cyan(`📄 Report saved to: ${result.reportPath}`));
      } catch (err: any) {
        spinner.fail('❌ Analysis failed');
        console.error(chalk.red(err?.message || err));
      }
    } else {
      console.log(chalk.cyan('\n🚀 You can now run: sql-analyzer health'));
    }
  });

// Config command
program
  .command('config')
  .description('Manage configuration')
  .option('--init', 'Initialize default configuration')
  .option('--validate', 'Validate current configuration')
  .option('--show', 'Show current configuration')
  .action(async (options) => {
    if (options.init) {
      const configPath = './sql-analyzer.config.json';
      const defaultConfig = {
        database: {
          host: 'localhost',
          port: 5432,
          database: 'your_database',
          user: 'postgres',
          password: 'your_password'
        },
        analysis: {
          securityLevel: 'standard'
        },
        reporting: {
          format: 'html',
          outputPath: './reports'
        }
      };
      
      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log(chalk.green(`✅ Default configuration created: ${configPath}`));
    }
    
    if (options.validate) {
      try {
        const configManager = ConfigManager.fromEnvironment();
        const validation = configManager.validateConfig();
        
        if (validation.valid) {
          console.log(chalk.green('✅ Configuration is valid'));
        } else {
          console.log(chalk.red('❌ Configuration errors:'));
          validation.errors.forEach(error => {
            console.log(chalk.red(`   • ${error}`));
          });
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Configuration validation failed:'), error.message);
      }
    }
    
    if (options.show) {
      try {
        const configManager = ConfigManager.fromEnvironment();
        const config = configManager.getConfig();
        console.log(chalk.blue('📋 Current Configuration:'));
        console.log(JSON.stringify(config, null, 2));
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to load configuration:'), error.message);
      }
    }
  });

// Examples command
program
  .command('examples')
  .description('Show usage examples')
  .action(() => {
    console.log(chalk.bold.blue('💡 Usage Examples\n'));
    
    console.log(chalk.yellow('Basic health audit:'));
    console.log('  sql-analyzer health -c "postgresql://user:pass@localhost/db"\n');
    
    console.log(chalk.yellow('HTML report with AI insights:'));
    console.log('  sql-analyzer health -c "postgresql://user:pass@localhost/db" --ai --format html\n');
    
    console.log(chalk.yellow('CI/CD integration:'));
    console.log('  sql-analyzer health -c "$DATABASE_URL" --format json --fail-on-critical\n');
    
    console.log(chalk.yellow('Interactive setup:'));
    console.log('  sql-analyzer setup\n');
    
    console.log(chalk.yellow('Configuration management:'));
    console.log('  sql-analyzer config --init');
    console.log('  sql-analyzer config --validate\n');
    
    console.log(chalk.gray('For more information, visit: https://github.com/vasoyaprince14/sql-optimizer'));
  });

// Error handling
program.on('command:*', () => {
  console.error(chalk.red('❌ Invalid command. Use --help for available commands.'));
  process.exit(1);
});

// Parse CLI arguments
program.parse();

// If no args, launch interactive wizard instead of help
if (!process.argv.slice(2).length) {
  (async () => {
    await (program as any).commands.find((c: any) => c.name() === 'setup')._actionHandler([]);
  })();
}