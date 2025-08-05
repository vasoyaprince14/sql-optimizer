import { Client } from 'pg';

export interface DatabaseHealthReport {
  databaseInfo: DatabaseInfo;
  schemaHealth: SchemaHealthScore;
  indexAnalysis: IndexAnalysis;
  performanceIssues: PerformanceIssue[];
  securityIssues: SecurityIssue[];
  optimizationRecommendations: OptimizationRecommendation[];
  costAnalysis: DatabaseCostAnalysis;
  maintenanceRecommendations: MaintenanceRecommendation[];
}

export interface DatabaseInfo {
  version: string;
  size: string;
  tableCount: number;
  indexCount: number;
  connectionInfo: {
    maxConnections: number;
    activeConnections: number;
  };
  settings: DatabaseSettings;
}

export interface DatabaseSettings {
  sharedBuffers: string;
  effectiveCacheSize: string;
  workMem: string;
  maintenanceWorkMem: string;
  checkpointCompletionTarget: number;
  walBuffers: string;
  randomPageCost: number;
}

export interface SchemaHealthScore {
  overall: number;
  normalization: number;
  indexEfficiency: number;
  foreignKeyIntegrity: number;
  dataTypes: number;
  naming: number;
  issues: SchemaIssue[];
}

export interface SchemaIssue {
  type: 'missing_pk' | 'missing_fk_index' | 'redundant_index' | 'poor_naming' | 'data_type_inefficiency';
  table: string;
  column?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
  sqlFix?: string;
}

export interface IndexAnalysis {
  totalIndexes: number;
  unusedIndexes: UnusedIndex[];
  missingIndexes: MissingIndex[];
  duplicateIndexes: DuplicateIndex[];
  oversizedIndexes: OversizedIndex[];
  indexEfficiencyScore: number;
}

export interface UnusedIndex {
  name: string;
  table: string;
  size: string;
  lastUsed: string | null;
  impact: 'low' | 'medium' | 'high';
}

export interface MissingIndex {
  table: string;
  columns: string[];
  reason: string;
  estimatedImpact: 'low' | 'medium' | 'high';
  suggestedSql: string;
}

export interface DuplicateIndex {
  indexes: string[];
  table: string;
  columns: string[];
  wastedSpace: string;
}

export interface OversizedIndex {
  name: string;
  table: string;
  size: string;
  suggestion: string;
}

export interface PerformanceIssue {
  type: 'slow_query' | 'table_bloat' | 'lock_contention' | 'poor_statistics';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  solution: string;
  sqlFix?: string;
}

export interface SecurityIssue {
  type: 'weak_permissions' | 'unencrypted_data' | 'default_passwords' | 'excessive_privileges';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}

export interface OptimizationRecommendation {
  category: 'performance' | 'storage' | 'maintenance' | 'security';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  estimatedImpact: string;
  implementation: string;
  sqlCommands?: string[];
}

export interface DatabaseCostAnalysis {
  storageUsage: {
    totalSize: string;
    dataSize: string;
    indexSize: string;
    wastedSpace: string;
  };
  estimatedCosts: {
    storage: number;
    compute: number;
    maintenance: number;
  };
  optimizationSavings: {
    storage: number;
    performance: number;
  };
}

export interface MaintenanceRecommendation {
  task: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  importance: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  command?: string;
}

export class DatabaseHealthAuditor {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Perform comprehensive database health audit
   */
  async performHealthAudit(): Promise<DatabaseHealthReport> {
    console.log('🔍 Starting comprehensive database health audit...');

    const [
      databaseInfo,
      schemaHealth,
      indexAnalysis,
      performanceIssues,
      securityIssues,
      costAnalysis
    ] = await Promise.all([
      this.getDatabaseInfo(),
      this.analyzeSchemaHealth(),
      this.analyzeIndexes(),
      this.detectPerformanceIssues(),
      this.detectSecurityIssues(),
      this.analyzeCosts()
    ]);

    const optimizationRecommendations = this.generateOptimizationRecommendations(
      schemaHealth,
      indexAnalysis,
      performanceIssues,
      securityIssues
    );

    const maintenanceRecommendations = this.generateMaintenanceRecommendations();

    return {
      databaseInfo,
      schemaHealth,
      indexAnalysis,
      performanceIssues,
      securityIssues,
      optimizationRecommendations,
      costAnalysis,
      maintenanceRecommendations
    };
  }

  /**
   * Get comprehensive database information
   */
  private async getDatabaseInfo(): Promise<DatabaseInfo> {
    console.log('📊 Gathering database information...');

    const versionResult = await this.client.query('SELECT version()');
    const sizeResult = await this.client.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `);
    
    const tableCountResult = await this.client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    const indexCountResult = await this.client.query(`
      SELECT COUNT(*) as count
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `);

    const connectionsResult = await this.client.query(`
      SELECT 
        setting::int as max_connections,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections
      FROM pg_settings 
      WHERE name = 'max_connections'
    `);

    const settingsResult = await this.client.query(`
      SELECT name, setting, unit 
      FROM pg_settings 
      WHERE name IN (
        'shared_buffers', 'effective_cache_size', 'work_mem', 
        'maintenance_work_mem', 'checkpoint_completion_target',
        'wal_buffers', 'random_page_cost'
      )
    `);

    const settings: any = {};
    settingsResult.rows.forEach(row => {
      settings[row.name] = row.unit ? `${row.setting} ${row.unit}` : parseFloat(row.setting);
    });

    return {
      version: versionResult.rows[0].version,
      size: sizeResult.rows[0].size,
      tableCount: parseInt(tableCountResult.rows[0].count),
      indexCount: parseInt(indexCountResult.rows[0].count),
      connectionInfo: {
        maxConnections: connectionsResult.rows[0].max_connections,
        activeConnections: connectionsResult.rows[0].active_connections
      },
      settings: {
        sharedBuffers: settings.shared_buffers || 'unknown',
        effectiveCacheSize: settings.effective_cache_size || 'unknown',
        workMem: settings.work_mem || 'unknown',
        maintenanceWorkMem: settings.maintenance_work_mem || 'unknown',
        checkpointCompletionTarget: settings.checkpoint_completion_target || 0.5,
        walBuffers: settings.wal_buffers || 'unknown',
        randomPageCost: settings.random_page_cost || 4.0
      }
    };
  }

  /**
   * Analyze schema health and detect issues
   */
  private async analyzeSchemaHealth(): Promise<SchemaHealthScore> {
    console.log('🔍 Analyzing schema health...');

    const issues: SchemaIssue[] = [];
    let scores = { normalization: 8, indexEfficiency: 7, foreignKeyIntegrity: 9, dataTypes: 8, naming: 9 };

    // Check for tables without primary keys
    const noPkResult = await this.client.query(`
      SELECT table_name 
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints tc
          WHERE tc.table_name = t.table_name 
            AND tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = 'public'
        )
    `);

    noPkResult.rows.forEach(row => {
      issues.push({
        type: 'missing_pk',
        table: row.table_name,
        severity: 'critical',
        description: `Table '${row.table_name}' has no primary key`,
        suggestion: 'Add a primary key to ensure data integrity and better performance',
        sqlFix: `ALTER TABLE ${row.table_name} ADD COLUMN id SERIAL PRIMARY KEY;`
      });
      scores.foreignKeyIntegrity -= 1;
    });

    // Check for foreign keys without indexes
    const unindexedFkResult = await this.client.query(`
      SELECT 
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE tablename = tc.table_name 
            AND indexdef LIKE '%' || kcu.column_name || '%'
        )
    `);

    unindexedFkResult.rows.forEach(row => {
      issues.push({
        type: 'missing_fk_index',
        table: row.table_name,
        column: row.column_name,
        severity: 'high',
        description: `Foreign key '${row.column_name}' in table '${row.table_name}' is not indexed`,
        suggestion: 'Create an index on foreign key columns for better JOIN performance',
        sqlFix: `CREATE INDEX idx_${row.table_name}_${row.column_name} ON ${row.table_name}(${row.column_name});`
      });
      scores.indexEfficiency -= 0.5;
    });

    // Check for inefficient data types
    const inefficientTypesResult = await this.client.query(`
      SELECT table_name, column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          (data_type = 'character varying' AND character_maximum_length > 255)
          OR data_type = 'text'
        )
    `);

    inefficientTypesResult.rows.forEach(row => {
      if (row.data_type === 'text' || row.character_maximum_length > 1000) {
        issues.push({
          type: 'data_type_inefficiency',
          table: row.table_name,
          column: row.column_name,
          severity: 'medium',
          description: `Column '${row.column_name}' uses inefficient data type '${row.data_type}'`,
          suggestion: 'Consider using more specific data types for better performance'
        });
        scores.dataTypes -= 0.3;
      }
    });

    const overall = Math.round((scores.normalization + scores.indexEfficiency + scores.foreignKeyIntegrity + scores.dataTypes + scores.naming) / 5);

    return {
      overall: Math.max(overall, 0),
      normalization: Math.max(scores.normalization, 0),
      indexEfficiency: Math.max(scores.indexEfficiency, 0),
      foreignKeyIntegrity: Math.max(scores.foreignKeyIntegrity, 0),
      dataTypes: Math.max(scores.dataTypes, 0),
      naming: Math.max(scores.naming, 0),
      issues
    };
  }

  /**
   * Analyze indexes for efficiency and issues
   */
  private async analyzeIndexes(): Promise<IndexAnalysis> {
    console.log('📈 Analyzing index efficiency...');

    const totalIndexesResult = await this.client.query(`
      SELECT COUNT(*) as count FROM pg_indexes WHERE schemaname = 'public'
    `);

    // Find unused indexes (simplified check)
    const unusedIndexesResult = await this.client.query(`
      SELECT 
        indexrelname as name,
        relname as table,
        pg_size_pretty(pg_relation_size(indexrelid)) as size
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0 AND schemaname = 'public'
    `);

    const unusedIndexes: UnusedIndex[] = unusedIndexesResult.rows.map(row => ({
      name: row.name,
      table: row.table,
      size: row.size,
      lastUsed: null,
      impact: 'medium' as const
    }));

    // Generate missing index suggestions
    const missingIndexes: MissingIndex[] = [];
    
    // Check for tables with high sequential scan ratios
    const seqScanResult = await this.client.query(`
      SELECT 
        relname as table,
        seq_scan,
        seq_tup_read,
        idx_scan,
        idx_tup_fetch
      FROM pg_stat_user_tables
      WHERE seq_scan > idx_scan * 2 AND seq_scan > 100
    `);

    seqScanResult.rows.forEach(row => {
      missingIndexes.push({
        table: row.table,
        columns: ['id'], // Simplified
        reason: 'High sequential scan ratio detected',
        estimatedImpact: 'high',
        suggestedSql: `-- Consider adding indexes on frequently queried columns for table ${row.table}`
      });
    });

    return {
      totalIndexes: parseInt(totalIndexesResult.rows[0].count),
      unusedIndexes,
      missingIndexes,
      duplicateIndexes: [], // Would need more complex logic
      oversizedIndexes: [], // Would need more complex logic
      indexEfficiencyScore: Math.max(8 - unusedIndexes.length * 0.5, 0)
    };
  }

  /**
   * Detect performance issues
   */
  private async detectPerformanceIssues(): Promise<PerformanceIssue[]> {
    console.log('⚡ Detecting performance issues...');

    const issues: PerformanceIssue[] = [];

    // Check for table bloat
    const bloatResult = await this.client.query(`
      SELECT 
        schemaname,
        relname as tablename,
        pg_size_pretty(pg_total_relation_size(relid)) as size
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 5
    `);

    bloatResult.rows.forEach(row => {
      if (row.size && !row.size.includes('kB')) { // Larger than KB
        issues.push({
          type: 'table_bloat',
          severity: 'medium',
          description: `Table '${row.tablename}' is large (${row.size}) and may benefit from optimization`,
          impact: 'Query performance may be degraded',
          solution: 'Consider VACUUM, REINDEX, or partitioning',
          sqlFix: `VACUUM ANALYZE ${row.tablename};`
        });
      }
    });

    // Check statistics freshness
    const statsResult = await this.client.query(`
      SELECT 
        schemaname,
        relname as tablename,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      WHERE last_analyze IS NULL OR last_analyze < NOW() - INTERVAL '7 days'
    `);

    statsResult.rows.forEach(row => {
      issues.push({
        type: 'poor_statistics',
        severity: 'medium',
        description: `Table '${row.tablename}' has outdated statistics`,
        impact: 'Query planner may make suboptimal decisions',
        solution: 'Run ANALYZE to update table statistics',
        sqlFix: `ANALYZE ${row.tablename};`
      });
    });

    return issues;
  }

  /**
   * Detect security issues
   */
  private async detectSecurityIssues(): Promise<SecurityIssue[]> {
    console.log('🔒 Checking security issues...');

    const issues: SecurityIssue[] = [];

    // Check for tables without proper permissions
    try {
      const permissionsResult = await this.client.query(`
        SELECT 
          table_name,
          privilege_type,
          grantee
        FROM information_schema.table_privileges
        WHERE table_schema = 'public'
          AND grantee = 'public'
          AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
      `);

      if (permissionsResult.rows.length > 0) {
        issues.push({
          type: 'weak_permissions',
          severity: 'high',
          description: 'Some tables have overly permissive access rights',
          recommendation: 'Review and restrict table permissions to necessary users only'
        });
      }
    } catch (error) {
      // Permission check failed, skip
    }

    return issues;
  }

  /**
   * Analyze database costs and usage
   */
  private async analyzeCosts(): Promise<DatabaseCostAnalysis> {
    console.log('💰 Analyzing database costs...');

    const sizeResult = await this.client.query(`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as total_size,
        pg_database_size(current_database()) as total_bytes
    `);

    const indexSizeResult = await this.client.query(`
      SELECT 
        pg_size_pretty(SUM(pg_relation_size(indexrelid))) as index_size,
        SUM(pg_relation_size(indexrelid)) as index_bytes
      FROM pg_stat_user_indexes
    `);

    const totalBytes = parseInt(sizeResult.rows[0].total_bytes) || 0;
    const indexBytes = parseInt(indexSizeResult.rows[0].index_bytes) || 0;
    const dataBytes = totalBytes - indexBytes;

    return {
      storageUsage: {
        totalSize: sizeResult.rows[0].total_size,
        dataSize: this.formatBytes(dataBytes),
        indexSize: indexSizeResult.rows[0].index_size || '0 bytes',
        wastedSpace: '0 bytes' // Would need more complex calculation
      },
      estimatedCosts: {
        storage: totalBytes / (1024 * 1024 * 1024) * 0.10, // $0.10 per GB rough estimate
        compute: 50, // Base compute cost
        maintenance: 20 // Base maintenance cost
      },
      optimizationSavings: {
        storage: 0,
        performance: 0
      }
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(
    schemaHealth: SchemaHealthScore,
    indexAnalysis: IndexAnalysis,
    performanceIssues: PerformanceIssue[],
    securityIssues: SecurityIssue[]
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Schema recommendations
    if (schemaHealth.overall < 7) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'Improve Schema Design',
        description: 'Schema health score is below recommended threshold',
        estimatedImpact: 'High - Better query performance and data integrity',
        implementation: 'Address missing primary keys and foreign key indexes',
        sqlCommands: schemaHealth.issues.filter(i => i.sqlFix).map(i => i.sqlFix!)
      });
    }

    // Index recommendations
    if (indexAnalysis.unusedIndexes.length > 0) {
      recommendations.push({
        category: 'storage',
        priority: 'medium',
        title: 'Remove Unused Indexes',
        description: `Found ${indexAnalysis.unusedIndexes.length} unused indexes`,
        estimatedImpact: 'Medium - Reduced storage costs and faster writes',
        implementation: 'Drop unused indexes after confirming they are not needed',
        sqlCommands: indexAnalysis.unusedIndexes.map(idx => `DROP INDEX ${idx.name};`)
      });
    }

    // Performance recommendations
    if (performanceIssues.length > 0) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'Address Performance Issues',
        description: `Found ${performanceIssues.length} performance issues`,
        estimatedImpact: 'High - Improved query response times',
        implementation: 'Run maintenance commands and optimize queries',
        sqlCommands: performanceIssues.filter(i => i.sqlFix).map(i => i.sqlFix!)
      });
    }

    return recommendations;
  }

  /**
   * Generate maintenance recommendations
   */
  private generateMaintenanceRecommendations(): MaintenanceRecommendation[] {
    return [
      {
        task: 'VACUUM ANALYZE',
        frequency: 'weekly',
        importance: 'high',
        description: 'Update table statistics and reclaim space',
        command: 'VACUUM ANALYZE;'
      },
      {
        task: 'REINDEX',
        frequency: 'monthly',
        importance: 'medium',
        description: 'Rebuild indexes to maintain performance',
        command: 'REINDEX DATABASE your_database;'
      },
      {
        task: 'Check slow queries',
        frequency: 'weekly',
        importance: 'high',
        description: 'Monitor and optimize slow-running queries'
      },
      {
        task: 'Backup verification',
        frequency: 'daily',
        importance: 'critical',
        description: 'Ensure database backups are working correctly'
      }
    ];
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}