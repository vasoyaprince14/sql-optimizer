import chalk from 'chalk';
import * as fs from 'fs-extra';
import { ErrorHandler } from './error-handler';

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  suggestions: string[];
}

export class ConfigValidator {
  static async validateEnvironment(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      issues: [],
      warnings: [],
      suggestions: []
    };

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
      result.isValid = false;
      result.issues.push(`Node.js version ${nodeVersion} is not supported. Required: 18+`);
    } else if (majorVersion < 20) {
      result.warnings.push(`Node.js version ${nodeVersion} is supported but Node.js 20+ is recommended`);
    }

    // Check required environment variables
    if (!process.env.DATABASE_URL) {
      result.warnings.push('DATABASE_URL environment variable not set');
      result.suggestions.push('Set DATABASE_URL or use -c option for database connection');
    }

    // Check OpenAI configuration
    if (process.env.OPENAI_API_KEY) {
      if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
        result.warnings.push('OPENAI_API_KEY format appears invalid (should start with sk-)');
      }
    } else {
      result.suggestions.push('Set OPENAI_API_KEY to enable AI-powered insights');
    }

    // Check file permissions
    try {
      const testFile = './sql-analyzer-test-permissions';
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
    } catch (error) {
      result.warnings.push('Cannot write to current directory - some features may be limited');
      result.suggestions.push('Run from a directory with write permissions');
    }

    // Check network connectivity
    try {
      const https = require('https');
      const req = https.request('https://registry.npmjs.org', { timeout: 5000 }, () => {
        // Connection successful
      });
      req.on('error', () => {
        result.warnings.push('Cannot connect to npm registry - update checks may fail');
      });
      req.setTimeout(5000, () => {
        req.destroy();
        result.warnings.push('Network timeout - update checks may fail');
      });
      req.end();
    } catch (error) {
      result.warnings.push('Network connectivity issues detected');
    }

    return result;
  }

  static async validateConfigFile(configPath: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      issues: [],
      warnings: [],
      suggestions: []
    };

    try {
      if (!await fs.pathExists(configPath)) {
        result.issues.push(`Configuration file not found: ${configPath}`);
        result.suggestions.push('Run "sql-analyzer config --init" to create a configuration file');
        return result;
      }

      const configContent = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configContent);

      // Validate required fields
      if (!config.database) {
        result.issues.push('Missing database configuration section');
      } else {
        if (!config.database.connectionString && !config.database.host) {
          result.issues.push('Missing database connection string or host configuration');
        }
      }

      // Validate AI configuration
      if (config.ai?.enabled) {
        if (!config.ai.apiKey) {
          result.issues.push('AI is enabled but no API key provided');
        }
        if (!config.ai.provider) {
          result.warnings.push('AI provider not specified, defaulting to OpenAI');
        }
      }

      // Validate analysis settings
      if (config.analysis) {
        if (config.analysis.securityLevel && !['basic', 'standard', 'strict'].includes(config.analysis.securityLevel)) {
          result.issues.push('Invalid security level. Must be: basic, standard, or strict');
        }
      }

      // Validate reporting settings
      if (config.reporting) {
        const validFormats = ['cli', 'html', 'json', 'md', 'csv', 'xml'];
        if (config.reporting.format && !validFormats.includes(config.reporting.format)) {
          result.issues.push(`Invalid report format. Must be one of: ${validFormats.join(', ')}`);
        }
      }

    } catch (error: any) {
      result.isValid = false;
      result.issues.push(`Failed to parse configuration file: ${error.message}`);
      result.suggestions.push('Check JSON syntax and file format');
    }

    return result;
  }

  static showValidationResult(result: ValidationResult, context: string = 'Environment'): void {
    console.log(`\n${chalk.bold.blue(`🔍 ${context} Validation Results`)}`);
    console.log(chalk.gray('═'.repeat(60)));

    if (result.issues.length === 0 && result.warnings.length === 0) {
      console.log(chalk.green('✅ All checks passed! Your environment is properly configured.'));
      return;
    }

    // Show issues
    if (result.issues.length > 0) {
      console.log(chalk.red('\n❌ Issues found:'));
      result.issues.forEach(issue => {
        console.log(chalk.red(`  • ${issue}`));
      });
    }

    // Show warnings
    if (result.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️ Warnings:'));
      result.warnings.forEach(warning => {
        console.log(chalk.yellow(`  • ${warning}`));
      });
    }

    // Show suggestions
    if (result.suggestions.length > 0) {
      console.log(chalk.cyan('\n💡 Suggestions:'));
      result.suggestions.forEach(suggestion => {
        console.log(chalk.cyan(`  • ${suggestion}`));
      });
    }

    // Overall status
    if (result.isValid) {
      console.log(chalk.green('\n✅ Configuration is valid (with warnings)'));
    } else {
      console.log(chalk.red('\n❌ Configuration has issues that need to be resolved'));
    }
  }

  static async createSampleConfig(): Promise<string> {
    const sampleConfig = {
      database: {
        type: 'postgresql',
        connectionString: 'postgresql://user:password@localhost:5432/database',
        ssl: false
      },
      ai: {
        enabled: false,
        provider: 'openai',
        apiKey: 'your-openai-api-key-here',
        model: 'gpt-4'
      },
      analysis: {
        securityLevel: 'standard',
        includeSchema: true,
        includeIndexes: true,
        includeSecurity: true,
        includePerformance: true
      },
      reporting: {
        format: 'html',
        outputPath: './reports',
        includeCharts: true,
        customBranding: {
          companyName: 'Your Company'
        }
      },
      monitoring: {
        enabled: false,
        alerting: {
          enabled: false,
          slackWebhook: 'your-slack-webhook-url'
        }
      }
    };

    const configPath = './sql-analyzer.config.json';
    await fs.writeFile(configPath, JSON.stringify(sampleConfig, null, 2));
    return configPath;
  }
}
