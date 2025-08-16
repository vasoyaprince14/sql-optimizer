import chalk from 'chalk';

export interface ErrorContext {
  command?: string;
  connectionString?: string;
  databaseType?: string;
  operation?: string;
  timestamp: Date;
}

export class ErrorHandler {
  private static readonly ERROR_LOG_FILE = './sql-analyzer-errors.log';

  static handleError(error: any, context: Partial<ErrorContext> = {}): void {
    const errorContext: ErrorContext = {
      timestamp: new Date(),
      ...context
    };

    // Log error for debugging
    this.logError(error, errorContext);

    // Show user-friendly error message
    this.showUserFriendlyError(error, errorContext);

    // Provide helpful suggestions
    this.showHelpfulSuggestions(error, errorContext);
  }

  private static logError(error: any, context: ErrorContext): void {
    try {
      const errorLog = {
        timestamp: context.timestamp.toISOString(),
        error: {
          name: error?.name || 'UnknownError',
          message: error?.message || 'Unknown error occurred',
          stack: error?.stack || '',
          code: error?.code || '',
          detail: error?.detail || ''
        },
        context,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      };

      // Write to log file
      const fs = require('fs-extra');
      fs.appendFileSync(this.ERROR_LOG_FILE, JSON.stringify(errorLog, null, 2) + '\n---\n');
    } catch (logError) {
      // Silently fail if logging fails
    }
  }

  private static showUserFriendlyError(error: any, context: ErrorContext): void {
    console.log('\n' + '='.repeat(60));
    console.log(chalk.red.bold('❌ An error occurred during operation'));
    
    if (context.command) {
      console.log(chalk.white(`Command: ${context.command}`));
    }
    
    if (context.operation) {
      console.log(chalk.white(`Operation: ${context.operation}`));
    }

    // Show specific error messages for common issues
    if (error?.code === 'ECONNREFUSED') {
      console.log(chalk.yellow('💡 Connection refused - Check if database is running'));
      console.log(chalk.yellow('💡 Verify host, port, and firewall settings'));
    } else if (error?.code === 'ENOTFOUND') {
      console.log(chalk.yellow('💡 Host not found - Check database hostname/IP'));
    } else if (error?.code === '28P01') {
      console.log(chalk.yellow('💡 Authentication failed - Check username/password'));
    } else if (error?.code === '3D000') {
      console.log(chalk.yellow('💡 Database does not exist - Check database name'));
    } else if (error?.code === '42501') {
      console.log(chalk.yellow('💡 Permission denied - Check user privileges'));
    } else {
      console.log(chalk.red(`Error: ${error?.message || 'Unknown error'}`));
    }

    console.log('='.repeat(60));
  }

  private static showHelpfulSuggestions(error: any, context: ErrorContext): void {
    console.log(chalk.cyan('\n🔧 Troubleshooting Tips:'));
    
    if (context.connectionString) {
      console.log(chalk.white('• Verify your connection string format'));
      console.log(chalk.white('• Check if database service is running'));
      console.log(chalk.white('• Ensure network connectivity'));
    }

    console.log(chalk.white('• Run with --verbose for detailed output'));
    console.log(chalk.white('• Check logs at: ./sql-analyzer-errors.log'));
    console.log(chalk.white('• Visit: https://github.com/vasoyaprince14/sql-optimizer/issues'));
    
    console.log(chalk.green('\n💡 Need help? Create an issue with the error log!'));
  }

  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: Partial<ErrorContext> = {}
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error, context);
      return null;
    }
  }

  static validateConnectionString(connectionString: string): boolean {
    try {
      const url = new URL(connectionString);
      return ['postgresql:', 'mysql:', 'mssql:', 'oracle:'].includes(url.protocol);
    } catch {
      return false;
    }
  }

  static sanitizeConnectionString(connectionString: string): string {
    try {
      const url = new URL(connectionString);
      if (url.password) {
        url.password = '***';
      }
      return url.toString();
    } catch {
      return connectionString.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    }
  }
}
