import { Client } from 'pg';
import chalk from 'chalk';
import ora from 'ora';
import { ErrorHandler } from './error-handler';

export interface ConnectionTest {
  basic: boolean;
  privileges: boolean;
  statistics: boolean;
  schema: boolean;
  details: {
    user: string;
    database: string;
    version: string;
    host: string;
    port: number;
  };
}

export class ConnectionValidator {
  static async validateConnection(connectionString: string): Promise<ConnectionTest> {
    const spinner = ora('🔍 Validating database connection...').start();
    
    const result: ConnectionTest = {
      basic: false,
      privileges: false,
      statistics: false,
      schema: false,
      details: {
        user: '',
        database: '',
        version: '',
        host: '',
        port: 5432
      }
    };

    try {
      const client = new Client({ connectionString });
      await client.connect();
      
      // Basic connectivity
      try {
        await client.query('SELECT 1');
        result.basic = true;
        spinner.text = '✅ Basic connectivity - Testing privileges...';
      } catch (e) {
        spinner.fail('❌ Basic connectivity failed');
        await client.end();
        return result;
      }

      // Get connection details
      try {
        const details = await client.query(`
          SELECT 
            current_user as user,
            current_database() as database,
            version() as version,
            inet_server_addr() as host,
            inet_server_port() as port
        `);
        
        if (details.rows[0]) {
          result.details = {
            user: details.rows[0].user,
            database: details.rows[0].database,
            version: details.rows[0].version,
            host: details.rows[0].host || 'localhost',
            port: details.rows[0].port || 5432
          };
        }
      } catch (e) {
        // Continue even if we can't get all details
      }

      // Test privileges
      try {
        await client.query('SELECT * FROM pg_stat_activity LIMIT 1');
        result.privileges = true;
        spinner.text = '✅ Privileges - Testing statistics access...';
      } catch (e) {
        spinner.text = '⚠️ Limited privileges - Some features may not work';
      }

      // Test statistics access
      try {
        await client.query('SELECT * FROM pg_stat_database LIMIT 1');
        result.statistics = true;
        spinner.text = '✅ Statistics access - Testing schema access...';
      } catch (e) {
        spinner.text = '⚠️ Limited statistics access - Performance analysis may be limited';
      }

      // Test schema access
      try {
        await client.query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'");
        result.schema = true;
        spinner.text = '✅ Schema access - Connection validation complete!';
      } catch (e) {
        spinner.text = '⚠️ Limited schema access - Schema analysis may be limited';
      }

      await client.end();
      spinner.succeed('✅ Database connection validated successfully!');
      
      this.showConnectionSummary(result);
      return result;

    } catch (error) {
      spinner.fail('❌ Connection validation failed');
      ErrorHandler.handleError(error, {
        operation: 'connection-validation',
        connectionString: ErrorHandler.sanitizeConnectionString(connectionString)
      });
      return result;
    }
  }

  private static showConnectionSummary(result: ConnectionTest): void {
    console.log('\n' + chalk.bold.blue('🔗 CONNECTION SUMMARY'));
    console.log(chalk.gray('═'.repeat(60)));
    
    console.log(`${chalk.cyan('User:')} ${result.details.user}`);
    console.log(`${chalk.cyan('Database:')} ${result.details.database}`);
    console.log(`${chalk.cyan('Host:')} ${result.details.host}:${result.details.port}`);
    console.log(`${chalk.cyan('Version:')} ${result.details.version.split(' ')[0]}`);
    
    console.log('\n' + chalk.cyan('Capabilities:'));
    console.log(`${result.basic ? '✅' : '❌'} Basic connectivity`);
    console.log(`${result.privileges ? '✅' : '❌'} Privilege access`);
    console.log(`${result.statistics ? '✅' : '❌'} Statistics access`);
    console.log(`${result.schema ? '✅' : '❌'} Schema access`);
    
    if (!result.privileges || !result.statistics || !result.schema) {
      console.log(chalk.yellow('\n⚠️ Some features may be limited due to insufficient privileges'));
      console.log(chalk.yellow('💡 Consider running with a user that has more database access'));
    }
  }

  static async quickTest(connectionString: string): Promise<boolean> {
    try {
      const client = new Client({ connectionString });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return true;
    } catch {
      return false;
    }
  }
}
