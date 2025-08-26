/**
 * Quick Health Checker - Fast database health assessment
 * Provides rapid health scoring without full analysis
 * 
 * @author Prince Vasoya
 * @version 1.5.2
 */

import { Client } from 'pg';
import { EventEmitter } from 'events';

export interface QuickHealthScore {
  overallScore: number;
  connectionHealth: number;
  performanceHealth: number;
  securityHealth: number;
  maintenanceHealth: number;
  criticalIssues: number;
  warnings: number;
  recommendations: string[];
  checkTime: number; // milliseconds
  timestamp: Date;
}

export interface QuickHealthOptions {
  timeout?: number;
  includeSecurity?: boolean;
  includePerformance?: boolean;
  includeMaintenance?: boolean;
}

export class QuickHealthChecker extends EventEmitter {
  private client: Client;
  private options: QuickHealthOptions;

  constructor(connectionString: string, options: QuickHealthOptions = {}) {
    super();
    this.client = new Client({ connectionString });
    this.options = {
      timeout: 5000,
      includeSecurity: true,
      includePerformance: true,
      includeMaintenance: true,
      ...options
    };
  }

  /**
   * Perform quick health check
   */
  async checkHealth(): Promise<QuickHealthScore> {
    const startTime = Date.now();
    let connectionHealth = 0;
    let performanceHealth = 0;
    let securityHealth = 0;
    let maintenanceHealth = 0;
    let criticalIssues = 0;
    let warnings = 0;
    const recommendations: string[] = [];

    try {
      await this.client.connect();
      this.emit('progress', 'Connected to database');

      // Connection health check
      const connectionResult = await this.checkConnectionHealth();
      connectionHealth = connectionResult.score;
      criticalIssues += connectionResult.criticalIssues;
      warnings += connectionResult.warnings;
      recommendations.push(...connectionResult.recommendations);

      // Performance health check
      if (this.options.includePerformance) {
        const performanceResult = await this.checkPerformanceHealth();
        performanceHealth = performanceResult.score;
        criticalIssues += performanceResult.criticalIssues;
        warnings += performanceResult.warnings;
        recommendations.push(...performanceResult.recommendations);
      }

      // Security health check
      if (this.options.includeSecurity) {
        const securityResult = await this.checkSecurityHealth();
        securityHealth = securityResult.score;
        criticalIssues += securityResult.criticalIssues;
        warnings += securityResult.warnings;
        recommendations.push(...securityResult.recommendations);
      }

      // Maintenance health check
      if (this.options.includeMaintenance) {
        const maintenanceResult = await this.checkMaintenanceHealth();
        maintenanceHealth = maintenanceResult.score;
        criticalIssues += maintenanceResult.criticalIssues;
        warnings += maintenanceResult.warnings;
        recommendations.push(...maintenanceResult.recommendations);
      }

    } catch (error) {
      this.emit('error', error);
      connectionHealth = 0;
      criticalIssues++;
      recommendations.push('Database connection failed - check connection string and credentials');
    } finally {
      await this.client.end();
    }

    const checkTime = Date.now() - startTime;
    const overallScore = Math.round(
      (connectionHealth + performanceHealth + securityHealth + maintenanceHealth) / 4
    );

    const result: QuickHealthScore = {
      overallScore,
      connectionHealth,
      performanceHealth,
      securityHealth,
      maintenanceHealth,
      criticalIssues,
      warnings,
      recommendations: recommendations.slice(0, 5), // Top 5 recommendations
      checkTime,
      timestamp: new Date()
    };

    this.emit('complete', result);
    return result;
  }

  private async checkConnectionHealth() {
    const result = { score: 0, criticalIssues: 0, warnings: 0, recommendations: [] as string[] };
    
    try {
      // Test basic connectivity
      await this.client.query('SELECT 1');
      result.score += 25;

      // Check connection count
      const connResult = await this.client.query(`
        SELECT count(*) as connections, 
               setting as max_connections 
        FROM pg_stat_activity, pg_settings 
        WHERE name = 'max_connections'
      `);
      
      const connections = parseInt(connResult.rows[0].connections);
      const maxConnections = parseInt(connResult.rows[0].max_connections);
      const connectionUsage = (connections / maxConnections) * 100;

      if (connectionUsage > 90) {
        result.criticalIssues++;
        result.recommendations.push('Connection usage is critically high (>90%)');
      } else if (connectionUsage > 75) {
        result.warnings++;
        result.recommendations.push('Connection usage is high (>75%)');
      } else {
        result.score += 25;
      }

      // Check for long-running queries
      const longQueries = await this.client.query(`
        SELECT count(*) as long_queries 
        FROM pg_stat_activity 
        WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes'
      `);
      
      if (parseInt(longQueries.rows[0].long_queries) > 0) {
        result.warnings++;
        result.recommendations.push('Long-running queries detected');
      } else {
        result.score += 25;
      }

      // Check database size
      const dbSize = await this.client.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      
      result.score += 25; // Basic connectivity working

    } catch (error) {
      result.criticalIssues++;
      result.recommendations.push('Connection health check failed');
    }

    return result;
  }

  private async checkPerformanceHealth() {
    const result = { score: 0, criticalIssues: 0, warnings: 0, recommendations: [] as string[] };
    
    try {
      // Check for missing indexes
      const missingIndexes = await this.client.query(`
        SELECT count(*) as missing_indexes
        FROM pg_stat_user_tables t
        WHERE t.seq_scan > t.idx_scan * 10
        AND t.n_tup_ins + t.n_tup_upd + t.n_tup_del > 1000
      `);
      
      const missing = parseInt(missingIndexes.rows[0].missing_indexes);
      if (missing > 5) {
        result.criticalIssues++;
        result.recommendations.push(`${missing} tables may need indexes`);
      } else if (missing > 0) {
        result.warnings++;
        result.recommendations.push(`${missing} tables may benefit from indexes`);
      } else {
        result.score += 25;
      }

      // Check table bloat
      const bloatCheck = await this.client.query(`
        SELECT count(*) as bloated_tables
        FROM pg_stat_user_tables
        WHERE n_dead_tup > n_live_tup * 0.1
        AND n_live_tup > 1000
      `);
      
      const bloated = parseInt(bloatCheck.rows[0].bloated_tables);
      if (bloated > 3) {
        result.warnings++;
        result.recommendations.push(`${bloated} tables may need VACUUM`);
      } else {
        result.score += 25;
      }

      // Check cache hit ratio
      const cacheHit = await this.client.query(`
        SELECT round(100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2) as cache_hit_ratio
        FROM pg_stat_database
        WHERE datname = current_database()
      `);
      
      const hitRatio = parseFloat(cacheHit.rows[0].cache_hit_ratio);
      if (hitRatio < 90) {
        result.warnings++;
        result.recommendations.push(`Cache hit ratio is low (${hitRatio}%)`);
      } else {
        result.score += 25;
      }

      // Check for locks
      const locks = await this.client.query(`
        SELECT count(*) as lock_count
        FROM pg_locks
        WHERE NOT granted
      `);
      
      const lockCount = parseInt(locks.rows[0].lock_count);
      if (lockCount > 0) {
        result.warnings++;
        result.recommendations.push(`${lockCount} ungranted locks detected`);
      } else {
        result.score += 25;
      }

    } catch (error) {
      result.criticalIssues++;
      result.recommendations.push('Performance health check failed');
    }

    return result;
  }

  private async checkSecurityHealth() {
    const result = { score: 0, criticalIssues: 0, warnings: 0, recommendations: [] as string[] };
    
    try {
      // Check for public schema access
      const publicAccess = await this.client.query(`
        SELECT count(*) as public_tables
        FROM information_schema.table_privileges
        WHERE grantee = 'PUBLIC' AND privilege_type = 'SELECT'
      `);
      
      const publicTables = parseInt(publicAccess.rows[0].public_tables);
      if (publicTables > 0) {
        result.criticalIssues++;
        result.recommendations.push(`${publicTables} tables have public SELECT access`);
      } else {
        result.score += 25;
      }

      // Check for RLS policies
      const rlsCheck = await this.client.query(`
        SELECT count(*) as tables_without_rls
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r' AND n.nspname = 'public'
        AND NOT c.relrowsecurity
      `);
      
      const noRLS = parseInt(rlsCheck.rows[0].tables_without_rls);
      if (noRLS > 0) {
        result.warnings++;
        result.recommendations.push(`${noRLS} tables don't have Row Level Security`);
      } else {
        result.score += 25;
      }

      // Check for weak passwords (basic check)
      const weakPasswords = await this.client.query(`
        SELECT count(*) as weak_users
        FROM pg_user
        WHERE passwd IS NULL OR passwd = ''
      `);
      
      const weakUsers = parseInt(weakPasswords.rows[0].weak_users);
      if (weakUsers > 0) {
        result.criticalIssues++;
        result.recommendations.push(`${weakUsers} users have weak passwords`);
      } else {
        result.score += 25;
      }

      // Check SSL configuration
      const sslCheck = await this.client.query(`
        SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()
      `);
      
      if (sslCheck.rows.length > 0 && sslCheck.rows[0].ssl) {
        result.score += 25;
      } else {
        result.warnings++;
        result.recommendations.push('SSL connection not detected');
      }

    } catch (error) {
      result.criticalIssues++;
      result.recommendations.push('Security health check failed');
    }

    return result;
  }

  private async checkMaintenanceHealth() {
    const result = { score: 0, criticalIssues: 0, warnings: 0, recommendations: [] as string[] };
    
    try {
      // Check last VACUUM
      const lastVacuum = await this.client.query(`
        SELECT count(*) as tables_need_vacuum
        FROM pg_stat_user_tables
        WHERE last_vacuum < NOW() - INTERVAL '7 days'
        OR last_vacuum IS NULL
      `);
      
      const needVacuum = parseInt(lastVacuum.rows[0].tables_need_vacuum);
      if (needVacuum > 5) {
        result.warnings++;
        result.recommendations.push(`${needVacuum} tables need VACUUM`);
      } else {
        result.score += 25;
      }

      // Check last ANALYZE
      const lastAnalyze = await this.client.query(`
        SELECT count(*) as tables_need_analyze
        FROM pg_stat_user_tables
        WHERE last_analyze < NOW() - INTERVAL '7 days'
        OR last_analyze IS NULL
      `);
      
      const needAnalyze = parseInt(lastAnalyze.rows[0].tables_need_analyze);
      if (needAnalyze > 5) {
        result.warnings++;
        result.recommendations.push(`${needAnalyze} tables need ANALYZE`);
      } else {
        result.score += 25;
      }

      // Check for unused indexes
      const unusedIndexes = await this.client.query(`
        SELECT count(*) as unused_indexes
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
      `);
      
      const unused = parseInt(unusedIndexes.rows[0].unused_indexes);
      if (unused > 3) {
        result.warnings++;
        result.recommendations.push(`${unused} indexes appear unused`);
      } else {
        result.score += 25;
      }

      // Check database size growth
      const dbSize = await this.client.query(`
        SELECT pg_database_size(current_database()) as size_bytes
      `);
      
      const sizeMB = parseInt(dbSize.rows[0].size_bytes) / (1024 * 1024);
      if (sizeMB > 10000) { // 10GB
        result.warnings++;
        result.recommendations.push('Large database size detected - consider archiving');
      } else {
        result.score += 25;
      }

    } catch (error) {
      result.criticalIssues++;
      result.recommendations.push('Maintenance health check failed');
    }

    return result;
  }

  /**
   * Static method for quick health check
   */
  static async quickCheck(connectionString: string, options?: QuickHealthOptions): Promise<QuickHealthScore> {
    const checker = new QuickHealthChecker(connectionString, options);
    return checker.checkHealth();
  }
}
