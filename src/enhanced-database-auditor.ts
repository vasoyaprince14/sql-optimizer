import { Client } from 'pg';
import OpenAI from 'openai';

// Enhanced interfaces for comprehensive analysis
export interface EnhancedDatabaseHealthReport {
  databaseInfo: DatabaseInfo;
  schemaHealth: SchemaHealthScore;
  indexAnalysis: IndexAnalysis;
  tableAnalysis: TableAnalysis;
  triggerAnalysis: TriggerAnalysis;
  procedureAnalysis: ProcedureAnalysis;
  securityAnalysis: SecurityAnalysis;
  performanceIssues: PerformanceIssue[];
  optimizationRecommendations: OptimizationRecommendation[];
  costAnalysis: DatabaseCostAnalysis;
  maintenanceRecommendations: MaintenanceRecommendation[];
  aiInsights?: AIInsights;
}

export interface TableAnalysis {
  totalTables: number;
  tablesWithoutPK: string[];
  tablesWithBloat: TableBloatInfo[];
  partitionedTables: PartitionInfo[];
  largeTables: LargeTableInfo[];
  orphanedTables: string[];
}

export interface TableBloatInfo {
  tableName: string;
  estimatedBloat: number;
  wastedSpace: string;
  recommendation: string;
  beforeOptimization: {
    size: string;
    performance: string;
  };
  afterOptimization: {
    expectedSize: string;
    expectedPerformance: string;
    improvementPercentage: number;
  };
}

export interface TriggerAnalysis {
  totalTriggers: number;
  activeTriggers: TriggerInfo[];
  disabledTriggers: TriggerInfo[];
  performanceImpactingTriggers: TriggerInfo[];
  recommendations: TriggerRecommendation[];
}

export interface TriggerInfo {
  name: string;
  table: string;
  event: string;
  timing: string;
  function: string;
  enabled: boolean;
  estimatedImpact: 'low' | 'medium' | 'high';
}

export interface TriggerRecommendation {
  trigger: string;
  issue: string;
  solution: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  beforeOptimization: string;
  afterOptimization: string;
  expectedImprovement: string;
}

export interface ProcedureAnalysis {
  totalProcedures: number;
  procedures: ProcedureInfo[];
  unusedProcedures: string[];
  performanceIssues: ProcedurePerformanceIssue[];
}

export interface ProcedureInfo {
  name: string;
  language: string;
  returnType: string;
  parameters: number;
  complexity: 'low' | 'medium' | 'high';
  lastExecuted?: string;
}

export interface ProcedurePerformanceIssue {
  procedure: string;
  issue: string;
  impact: string;
  solution: string;
  estimatedImprovement: string;
}

export interface SecurityAnalysis {
  rlsPolicies: RLSPolicyInfo[];
  permissions: PermissionAnalysis;
  vulnerabilities: SecurityVulnerability[];
  recommendations: SecurityRecommendation[];
}

export interface RLSPolicyInfo {
  table: string;
  policy: string;
  command: string;
  role: string;
  expression: string;
  enabled: boolean;
  effectiveness: 'good' | 'poor' | 'missing';
}

export interface PermissionAnalysis {
  overPrivilegedUsers: string[];
  publicAccess: string[];
  missingPermissions: string[];
  recommendations: string[];
}

export interface SecurityVulnerability {
  type: 'rls_disabled' | 'public_access' | 'weak_permissions' | 'unencrypted_data' | 'sql_injection_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedObjects: string[];
  impact: string;
  solution: string;
  priority: number;
}

export interface SecurityRecommendation {
  category: 'access_control' | 'encryption' | 'auditing' | 'policies';
  title: string;
  description: string;
  implementation: string;
  beforeState: string;
  afterState: string;
  securityImprovement: string;
}

export interface AIInsights {
  overallAssessment: string;
  priorityRecommendations: string[];
  riskAnalysis: string;
  performancePredictions: string;
  costOptimizationSuggestions: string[];
  implementationRoadmap: string[];
}

// Keep existing interfaces from original file
export interface DatabaseInfo {
  version: string;
  size: string;
  tableCount: number;
  indexCount: number;
  triggerCount: number;
  procedureCount: number;
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
  enableRLS: boolean;
}

export interface SchemaHealthScore {
  overall: number;
  normalization: number;
  indexEfficiency: number;
  foreignKeyIntegrity: number;
  dataTypes: number;
  naming: number;
  security: number;
  issues: SchemaIssue[];
  recommendations: SchemaRecommendation[];
}

export interface SchemaIssue {
  type: 'missing_pk' | 'missing_fk_index' | 'redundant_index' | 'poor_naming' | 'data_type_inefficiency' | 'security_risk';
  table: string;
  column?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
  sqlFix?: string;
  beforeFix: string;
  afterFix: string;
  expectedImprovement: string;
}

export interface SchemaRecommendation {
  type: 'index' | 'normalization' | 'data_type' | 'constraint' | 'security' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  sql?: string;
  impact: 'low' | 'medium' | 'high';
  fix: string;
  improvement: string;
}

export interface IndexAnalysis {
  totalIndexes: number;
  unusedIndexes: UnusedIndex[];
  missingIndexes: MissingIndex[];
  duplicateIndexes: DuplicateIndex[];
  oversizedIndexes: OversizedIndex[];
  indexEfficiencyScore: number;
  recommendations: IndexRecommendation[];
}

export interface IndexRecommendation {
  type: 'create' | 'drop' | 'modify';
  description: string;
  sql: string;
  estimatedImpact: string;
  beforeOptimization: {
    queryTime: string;
    diskUsage: string;
  };
  afterOptimization: {
    queryTime: string;
    diskUsage: string;
    improvement: string;
  };
}

export interface UnusedIndex {
  name: string;
  table: string;
  size: string;
  lastUsed: string | null;
  impact: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface MissingIndex {
  table: string;
  columns: string[];
  reason: string;
  estimatedImpact: 'low' | 'medium' | 'high';
  suggestedSql: string;
  performanceGain: string;
}

export interface DuplicateIndex {
  indexes: string[];
  table: string;
  columns: string[];
  wastedSpace: string;
  recommendation: string;
}

export interface OversizedIndex {
  name: string;
  table: string;
  size: string;
  suggestion: string;
  optimizationPotential: string;
}

export interface PerformanceIssue {
  type: 'slow_query' | 'table_bloat' | 'lock_contention' | 'poor_statistics' | 'inefficient_triggers';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  solution: string;
  sqlFix?: string;
  estimatedImprovement: string;
}

export interface OptimizationRecommendation {
  category: 'performance' | 'storage' | 'maintenance' | 'security';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  estimatedImpact: string;
  implementation: string;
  sqlCommands?: string[];
  timeToImplement: string;
  riskLevel: 'low' | 'medium' | 'high';
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
    monthly: number;
  };
}

export interface MaintenanceRecommendation {
  task: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  importance: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  command?: string;
  automation: string;
}

export interface PartitionInfo {
  table: string;
  partitionStrategy: string;
  partitionCount: number;
  effectiveness: 'good' | 'poor' | 'excellent';
}

export interface LargeTableInfo {
  name: string;
  size: string;
  rowCount: number;
  recommendations: string[];
}

export class EnhancedDatabaseHealthAuditor {
  private client: Client;
  private aiEnabled: boolean;
  private openaiApiKey?: string;

  constructor(client: Client, options?: { enableAI?: boolean; openaiApiKey?: string }) {
    this.client = client;
    this.aiEnabled = options?.enableAI || false;
    this.openaiApiKey = options?.openaiApiKey;
  }

  /**
   * Perform comprehensive enhanced database health audit
   */
  async performComprehensiveAudit(): Promise<EnhancedDatabaseHealthReport> {
    console.log('🔍 Starting comprehensive enhanced database health audit...');

    const [
      databaseInfo,
      schemaHealth,
      indexAnalysis,
      tableAnalysis,
      triggerAnalysis,
      procedureAnalysis,
      securityAnalysis,
      performanceIssues,
      costAnalysis
    ] = await Promise.all([
      this.getDatabaseInfo(),
      this.analyzeSchemaHealth(),
      this.analyzeIndexes(),
      this.analyzeTables(),
      this.analyzeTriggers(),
      this.analyzeProcedures(),
      this.analyzeSecurityAndRLS(),
      this.detectPerformanceIssues(),
      this.analyzeCosts()
    ]);

    const optimizationRecommendations = this.generateOptimizationRecommendations(
      schemaHealth,
      indexAnalysis,
      tableAnalysis,
      performanceIssues,
      securityAnalysis
    );

    const maintenanceRecommendations = this.generateMaintenanceRecommendations();

    let aiInsights: AIInsights | undefined;
    if (this.aiEnabled && this.openaiApiKey) {
      aiInsights = await this.generateAIInsights({
        databaseInfo,
        schemaHealth,
        indexAnalysis,
        tableAnalysis,
        securityAnalysis,
        performanceIssues,
        optimizationRecommendations
      });
    }

    return {
      databaseInfo,
      schemaHealth,
      indexAnalysis,
      tableAnalysis,
      triggerAnalysis,
      procedureAnalysis,
      securityAnalysis,
      performanceIssues,
      optimizationRecommendations,
      costAnalysis,
      maintenanceRecommendations,
      aiInsights
    };
  }

  /**
   * Get comprehensive database information including triggers and procedures
   */
  private async getDatabaseInfo(): Promise<DatabaseInfo> {
    const versionResult = await this.client.query('SELECT version()');
    const sizeResult = await this.client.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `);
    
    const tableCountResult = await this.client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    
    const indexCountResult = await this.client.query(`
      SELECT COUNT(*) as count FROM pg_indexes WHERE schemaname = 'public'
    `);

    const triggerCountResult = await this.client.query(`
      SELECT COUNT(*) as count FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
    `);

    const procedureCountResult = await this.client.query(`
      SELECT COUNT(*) as count FROM information_schema.routines 
      WHERE routine_schema = 'public'
    `);
    
    const connectionResult = await this.client.query(`
      SELECT 
        setting as max_connections 
      FROM pg_settings 
      WHERE name = 'max_connections'
    `);
    
    const activeConnectionsResult = await this.client.query(`
      SELECT count(*) as active_connections FROM pg_stat_activity
    `);

    const settingsResult = await this.client.query(`
      SELECT name, setting, unit FROM pg_settings 
      WHERE name IN (
        'shared_buffers', 'effective_cache_size', 'work_mem', 
        'maintenance_work_mem', 'checkpoint_completion_target', 
        'wal_buffers', 'random_page_cost', 'row_security'
      )
    `);

    const settings: any = {};
    settingsResult.rows.forEach(row => {
      settings[row.name] = row.unit ? `${row.setting}${row.unit}` : parseFloat(row.setting);
    });

    return {
      version: versionResult.rows[0].version,
      size: sizeResult.rows[0].size,
      tableCount: parseInt(tableCountResult.rows[0].count),
      indexCount: parseInt(indexCountResult.rows[0].count),
      triggerCount: parseInt(triggerCountResult.rows[0].count),
      procedureCount: parseInt(procedureCountResult.rows[0].count),
      connectionInfo: {
        maxConnections: parseInt(connectionResult.rows[0].max_connections),
        activeConnections: parseInt(activeConnectionsResult.rows[0].active_connections)
      },
      settings: {
        sharedBuffers: settings.shared_buffers || '128MB',
        effectiveCacheSize: settings.effective_cache_size || '4GB',
        workMem: settings.work_mem || '4MB',
        maintenanceWorkMem: settings.maintenance_work_mem || '64MB',
        checkpointCompletionTarget: settings.checkpoint_completion_target || 0.5,
        walBuffers: settings.wal_buffers || '16MB',
        randomPageCost: settings.random_page_cost || 4.0,
        enableRLS: settings.row_security === 'on'
      }
    };
  }

  /**
   * Analyze tables for bloat, partitioning, and other issues
   */
  private async analyzeTables(): Promise<TableAnalysis> {
    // Tables without primary keys
    const noPKResult = await this.client.query(`
      SELECT t.table_name
      FROM information_schema.tables t
      LEFT JOIN information_schema.table_constraints tc
        ON t.table_name = tc.table_name
        AND tc.constraint_type = 'PRIMARY KEY'
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND tc.constraint_name IS NULL
    `);

    // Approximate table bloat using dead tuples ratio and size heuristics
    const approxBloatResult = await this.client.query(`
      SELECT
        psut.schemaname,
        psut.relname as tablename,
        psut.n_live_tup,
        psut.n_dead_tup,
        CASE WHEN psut.n_live_tup = 0 THEN 0 ELSE (psut.n_dead_tup::numeric / GREATEST(psut.n_live_tup,1)) END AS dead_ratio,
        pg_total_relation_size(psut.relid) as total_bytes,
        pg_relation_size(psut.relid) as heap_bytes
      FROM pg_stat_user_tables psut
      WHERE psut.schemaname = 'public'
      ORDER BY psut.n_dead_tup DESC
      LIMIT 20
    `);

    // Large tables
    const largeTablesResult = await this.client.query(`
      SELECT 
        t.schemaname,
        t.tablename,
        pg_size_pretty(pg_total_relation_size(t.schemaname||'.'||t.tablename)) as size,
        pg_total_relation_size(t.schemaname||'.'||t.tablename) as size_bytes
      FROM pg_tables t
      WHERE t.schemaname = 'public'
      ORDER BY pg_total_relation_size(t.schemaname||'.'||t.tablename) DESC
      LIMIT 20
    `);

    const tablesWithoutPK = noPKResult.rows.map(row => row.table_name);
    
    const tablesWithBloat: TableBloatInfo[] = approxBloatResult.rows.map(row => {
      const wastedBytes = Math.max(Number(row.total_bytes) - Number(row.heap_bytes), 0);
      const deadRatio = Number(row.dead_ratio) || 0;
      const formatBytes = (bytes: number): string => {
        const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }
        return `${size.toFixed(2)} ${units[unitIndex]}`;
      };

      return {
        tableName: row.tablename,
        estimatedBloat: Math.max(deadRatio * 2, wastedBytes / Math.max(Number(row.heap_bytes), 1)),
        wastedSpace: formatBytes(wastedBytes),
        recommendation: `Consider VACUUM (ANALYZE) and scheduling regular maintenance; for minimal downtime, consider pg_repack`,
        beforeOptimization: {
          size: `Approx. overhead: ${formatBytes(wastedBytes)}`,
          performance: 'Potentially degraded due to bloat'
        },
        afterOptimization: {
          expectedSize: 'Reduced logical overhead',
          expectedPerformance: 'Improved sequential scans and index scans',
          improvementPercentage: Math.min(80, Math.round(deadRatio * 100))
        }
      } as TableBloatInfo;
    });

    const largeTables: LargeTableInfo[] = largeTablesResult.rows.map(row => ({
      name: row.tablename,
      size: row.size,
      rowCount: 0, // Would need additional query
      recommendations: [
        row.size_bytes > 1000000000 ? 'Consider partitioning' : '',
        'Regular VACUUM and ANALYZE',
        'Monitor for query performance'
      ].filter(Boolean)
    }));

    return {
      totalTables: parseInt((await this.client.query(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `)).rows[0].count),
      tablesWithoutPK,
      tablesWithBloat,
      partitionedTables: [], // Would need more complex query
      largeTables,
      orphanedTables: [] // Would need more analysis
    };
  }

  /**
   * Analyze triggers for performance impact
   */
  private async analyzeTriggers(): Promise<TriggerAnalysis> {
    const triggersResult = await this.client.query(`
      SELECT 
        t.trigger_name,
        t.event_object_table as table_name,
        t.event_manipulation,
        t.action_timing,
        p.proname as function_name,
        t.action_condition,
        CASE WHEN t.action_condition IS NULL THEN true ELSE false END as enabled
      FROM information_schema.triggers t
      JOIN pg_proc p ON p.oid = (
        SELECT oid FROM pg_proc 
        WHERE proname = split_part(t.action_statement, ' ', 2)
        LIMIT 1
      )
      WHERE t.trigger_schema = 'public'
    `);

    const activeTriggers: TriggerInfo[] = triggersResult.rows
      .filter(row => row.enabled)
      .map(row => ({
        name: row.trigger_name,
        table: row.table_name,
        event: row.event_manipulation,
        timing: row.action_timing,
        function: row.function_name,
        enabled: row.enabled,
        estimatedImpact: this.estimateTriggerImpact(row.event_manipulation, row.action_timing)
      }));

    const disabledTriggers: TriggerInfo[] = triggersResult.rows
      .filter(row => !row.enabled)
      .map(row => ({
        name: row.trigger_name,
        table: row.table_name,
        event: row.event_manipulation,
        timing: row.action_timing,
        function: row.function_name,
        enabled: row.enabled,
        estimatedImpact: 'low' as const
      }));

    const performanceImpactingTriggers = activeTriggers.filter(
      trigger => trigger.estimatedImpact === 'high'
    );

    const recommendations: TriggerRecommendation[] = performanceImpactingTriggers.map(trigger => ({
      trigger: trigger.name,
      issue: 'High performance impact trigger',
      solution: 'Consider optimizing trigger function or using async processing',
      priority: 'medium' as const,
      beforeOptimization: 'Trigger executes synchronously on every operation',
      afterOptimization: 'Optimized or async execution',
      expectedImprovement: '30-50% faster DML operations'
    }));

    return {
      totalTriggers: triggersResult.rows.length,
      activeTriggers,
      disabledTriggers,
      performanceImpactingTriggers,
      recommendations
    };
  }

  private estimateTriggerImpact(event: string, timing: string): 'low' | 'medium' | 'high' {
    if (timing === 'BEFORE' && ['INSERT', 'UPDATE'].includes(event)) {
      return 'high';
    }
    if (timing === 'AFTER' && event === 'UPDATE') {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Analyze stored procedures and functions
   */
  private async analyzeProcedures(): Promise<ProcedureAnalysis> {
    const proceduresResult = await this.client.query(`
      SELECT 
        p.proname as name,
        l.lanname as language,
        pg_get_function_result(p.oid) as return_type,
        p.pronargs as parameter_count,
        length(p.prosrc) as source_length
      FROM pg_proc p
      JOIN pg_language l ON p.prolang = l.oid
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.prokind = 'f'
    `);

    const procedures: ProcedureInfo[] = proceduresResult.rows.map(row => ({
      name: row.name,
      language: row.language,
      returnType: row.return_type,
      parameters: parseInt(row.parameter_count),
      complexity: this.estimateProcedureComplexity(row.source_length),
      lastExecuted: undefined // Would need pg_stat_user_functions if available
    }));

    return {
      totalProcedures: procedures.length,
      procedures,
      unusedProcedures: [], // Would need execution statistics
      performanceIssues: []
    };
  }

  private estimateProcedureComplexity(sourceLength: number): 'low' | 'medium' | 'high' {
    if (sourceLength > 5000) return 'high';
    if (sourceLength > 1000) return 'medium';
    return 'low';
  }

  /**
   * Comprehensive security analysis including RLS policies
   */
  private async analyzeSecurityAndRLS(): Promise<SecurityAnalysis> {
    // RLS Policies analysis
    const rlsResult = await this.client.query(`
      SELECT 
        n.nspname as schema_name,
        t.relname as table_name,
        p.polname as policy_name,
        p.polcmd as command,
        p.polroles::regrole[] as roles,
        pg_get_expr(p.polqual, p.polrelid) as expression,
        t.relrowsecurity as rls_enabled
      FROM pg_policy p
      JOIN pg_class t ON p.polrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE n.nspname = 'public'
    `);

    const rlsPolicies: RLSPolicyInfo[] = rlsResult.rows.map(row => ({
      table: row.table_name,
      policy: row.policy_name,
      command: row.command,
      role: row.roles ? row.roles.join(', ') : 'all',
      expression: row.expression || 'true',
      enabled: row.rls_enabled,
      effectiveness: this.evaluatePolicyEffectiveness(row.expression)
    }));

    // Check for tables without RLS when they should have it
    const tablesWithoutRLSResult = await this.client.query(`
      SELECT t.relname as table_name
      FROM pg_class t
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE n.nspname = 'public' 
        AND t.relkind = 'r'
        AND NOT t.relrowsecurity
        AND t.relname NOT IN ('pg_stat_statements', 'pg_buffercache')
    `);

    // Permission analysis
    const publicAccessResult = await this.client.query(`
      SELECT 
        t.table_name,
        t.privilege_type
      FROM information_schema.table_privileges t
      WHERE t.grantee = 'PUBLIC'
        AND t.table_schema = 'public'
    `);

    const vulnerabilities: SecurityVulnerability[] = [];
    
    // Add RLS vulnerabilities
    tablesWithoutRLSResult.rows.forEach(row => {
      vulnerabilities.push({
        type: 'rls_disabled',
        severity: 'high',
        description: `Table ${row.table_name} does not have Row Level Security enabled`,
        affectedObjects: [row.table_name],
        impact: 'Potential unauthorized data access',
        solution: `Enable RLS: ALTER TABLE ${row.table_name} ENABLE ROW LEVEL SECURITY;`,
        priority: 8
      });
    });

    // Add public access vulnerabilities
    publicAccessResult.rows.forEach(row => {
      vulnerabilities.push({
        type: 'public_access',
        severity: 'medium',
        description: `Table ${row.table_name} has ${row.privilege_type} access for PUBLIC`,
        affectedObjects: [row.table_name],
        impact: 'Potential data exposure',
        solution: `REVOKE ${row.privilege_type} ON ${row.table_name} FROM PUBLIC;`,
        priority: 6
      });
    });

    const recommendations: SecurityRecommendation[] = [
      {
        category: 'access_control',
        title: 'Implement Row Level Security',
        description: 'Enable RLS on sensitive tables',
        implementation: 'ALTER TABLE sensitive_table ENABLE ROW LEVEL SECURITY;',
        beforeState: 'No row-level access control',
        afterState: 'Fine-grained access control per row',
        securityImprovement: 'Prevents unauthorized data access at row level'
      }
    ];

    return {
      rlsPolicies,
      permissions: {
        overPrivilegedUsers: [],
        publicAccess: publicAccessResult.rows.map(row => row.table_name),
        missingPermissions: [],
        recommendations: ['Implement principle of least privilege']
      },
      vulnerabilities,
      recommendations
    };
  }

  private evaluatePolicyEffectiveness(expression: string): 'good' | 'poor' | 'missing' {
    if (!expression || expression === 'true') return 'poor';
    if (expression.includes('current_user') || expression.includes('session_user')) return 'good';
    return 'poor';
  }

  // Implement other required methods...
  private async analyzeSchemaHealth(): Promise<SchemaHealthScore> {
    const issues: SchemaIssue[] = [];

    // Missing primary keys
    const noPk = await this.client.query(`
      SELECT table_name
      FROM information_schema.tables t
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        WHERE tc.table_name = t.table_name
          AND tc.table_schema = 'public'
          AND tc.constraint_type = 'PRIMARY KEY'
      )
    `);
    noPk.rows.forEach((r: any) => {
      issues.push({
        type: 'missing_pk',
        table: r.table_name,
        severity: 'critical',
        description: `Table '${r.table_name}' has no primary key`,
        suggestion: 'Add a primary key to ensure data integrity and replication safety',
        sqlFix: `ALTER TABLE ${r.table_name} ADD COLUMN id BIGSERIAL PRIMARY KEY;`,
        beforeFix: 'No unique row identifier; replication and updates may be unreliable',
        afterFix: 'Each row uniquely identifiable; better planner statistics and integrity',
        expectedImprovement: 'Integrity and performance stability'
      });
    });

    // Foreign keys without indexes
    const fkNoIdx = await this.client.query(`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
        AND NOT EXISTS (
          SELECT 1 FROM pg_indexes i
          WHERE i.schemaname = 'public' AND i.tablename = tc.table_name AND i.indexdef LIKE '%'||kcu.column_name||'%'
        )
    `);
    fkNoIdx.rows.forEach((r: any) => {
      issues.push({
        type: 'missing_fk_index',
        table: r.table_name,
        column: r.column_name,
        severity: 'high',
        description: `Foreign key ${r.table_name}.${r.column_name} is not indexed`,
        suggestion: 'Index foreign key columns for faster joins and updates',
        sqlFix: `CREATE INDEX idx_${r.table_name}_${r.column_name} ON ${r.table_name}(${r.column_name});`,
        beforeFix: 'Joins and deletes/updates on parent rows may be slow (sequential scans)',
        afterFix: 'Planner can use index lookups for joins and FK checks',
        expectedImprovement: 'Faster joins and constraint checks'
      });
    });

    // Inefficient data types (very wide varchar or text where smaller types suffice)
    const ineffTypes = await this.client.query(`
      SELECT table_name, column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND ((data_type = 'character varying' AND character_maximum_length > 1024) OR data_type = 'text')
    `);
    ineffTypes.rows.forEach((r: any) => {
      issues.push({
        type: 'data_type_inefficiency',
        table: r.table_name,
        column: r.column_name,
        severity: 'medium',
        description: `Column ${r.table_name}.${r.column_name} uses ${r.data_type}${r.character_maximum_length ? `(${r.character_maximum_length})` : ''}`,
        suggestion: 'Consider right-sizing data types (e.g., VARCHAR(255)) for storage and cache efficiency',
        sqlFix: undefined,
        beforeFix: 'Larger on-disk footprint and memory usage than necessary',
        afterFix: 'Smaller rows and better cache locality',
        expectedImprovement: 'Lower IO and memory usage'
      });
    });

    // Naming heuristics (simple snake_case check)
    const badNames = await this.client.query(`
      SELECT t.table_name, c.column_name
      FROM information_schema.tables t
      JOIN information_schema.columns c ON c.table_name = t.table_name AND c.table_schema = t.table_schema
      WHERE t.table_schema = 'public' AND (
        t.table_name ~ '[A-Z]' OR c.column_name ~ '[A-Z]'
      )
      LIMIT 50
    `);
    badNames.rows.forEach((r: any) => {
      issues.push({
        type: 'poor_naming',
        table: r.table_name,
        column: r.column_name,
        severity: 'low',
        description: `Non-snake_case naming detected: ${r.table_name}.${r.column_name}`,
        suggestion: 'Adopt snake_case for consistency and tooling compatibility',
        sqlFix: undefined,
        beforeFix: 'Mixed naming conventions can reduce readability and complicate tooling',
        afterFix: 'Consistent naming improves maintainability',
        expectedImprovement: 'Developer productivity'
      });
    });

    // Scoring (simple heuristic)
    let normalization = 8;
    let indexEfficiency = Math.max(0, 9 - fkNoIdx.rows.length * 0.1);
    let foreignKeyIntegrity = Math.max(0, 9 - fkNoIdx.rows.length * 0.2);
    let dataTypes = Math.max(0, 8 - ineffTypes.rows.length * 0.05);
    let naming = Math.max(0, 8 - badNames.rows.length * 0.02);
    const security = 6; // derived elsewhere in the report
    const overall = Math.round((normalization + indexEfficiency + foreignKeyIntegrity + dataTypes + naming + security) / 6);

    // Recommendations derived from issues
    const recommendations: SchemaRecommendation[] = [];
    noPk.rows.forEach((r: any) => {
      recommendations.push({
        type: 'constraint',
        priority: 'critical',
        title: `Add primary key to ${r.table_name}`,
        description: 'Primary keys are essential for integrity and performance',
        sql: `ALTER TABLE ${r.table_name} ADD COLUMN id BIGSERIAL PRIMARY KEY;`,
        impact: 'high',
        fix: 'Add a BIGSERIAL PK or designate existing unique column',
        improvement: 'Improved integrity and planner statistics'
      });
    });
    fkNoIdx.rows.forEach((r: any) => {
      recommendations.push({
        type: 'index',
        priority: 'high',
        title: `Index foreign key ${r.table_name}.${r.column_name}`,
        description: 'Indexes on FKs speed up joins and cascades',
        sql: `CREATE INDEX idx_${r.table_name}_${r.column_name} ON ${r.table_name}(${r.column_name});`,
        impact: 'high',
        fix: 'Create a single-column index on FK',
        improvement: 'Faster joins and constraints'
      });
    });

    return {
      overall: Math.max(overall, 0),
      normalization,
      indexEfficiency,
      foreignKeyIntegrity,
      dataTypes,
      naming,
      security,
      issues,
      recommendations
    };
  }

  private async analyzeIndexes(): Promise<IndexAnalysis> {
    // Total indexes
    const totalIndexesResult = await this.client.query(`
      SELECT COUNT(*) as count FROM pg_indexes WHERE schemaname = 'public'
    `);

    // Unused indexes (no scans seen)
    const unusedIdxResult = await this.client.query(`
      SELECT indexrelname as name, relname as table,
             pg_size_pretty(pg_relation_size(indexrelid)) as size,
             idx_scan
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public' AND idx_scan = 0
    `);

    // Duplicate indexes (same table and same set of columns) – heuristic
    const duplicateIdxResult = await this.client.query(`
      WITH idx AS (
        SELECT
          t.relname   AS table_name,
          i.relname   AS index_name,
          array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS cols
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON ix.indexrelid = i.oid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
        GROUP BY 1,2
      )
      SELECT a.table_name,
             array_agg(a.index_name) AS index_names,
             a.cols
      FROM idx a
      JOIN idx b ON a.table_name = b.table_name AND a.index_name <> b.index_name AND a.cols = b.cols
      GROUP BY 1,3
    `);

    // Oversized indexes (heuristic: > 100MB)
    const oversizedIdxResult = await this.client.query(`
      SELECT i.relname as name,
             t.relname as table,
             pg_relation_size(i.oid) as bytes
      FROM pg_class i
      JOIN pg_index ix ON ix.indexrelid = i.oid
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_namespace n ON n.oid = i.relnamespace
      WHERE n.nspname = 'public' AND pg_relation_size(i.oid) > 100*1024*1024
    `);

    // Missing indexes heuristic: high seq_scan to idx_scan ratio
    const missingIdxResult = await this.client.query(`
      SELECT relname as table, seq_scan, idx_scan
      FROM pg_stat_user_tables
      WHERE seq_scan > (idx_scan * 5) AND seq_scan > 100
      ORDER BY seq_scan DESC
      LIMIT 20
    `);

    const toPretty = (bytes: number) => {
      const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];
      let size = bytes;
      let i = 0;
      while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
      return `${size.toFixed(2)} ${units[i]}`;
    };

    const unusedIndexes: UnusedIndex[] = unusedIdxResult.rows.map(r => ({
      name: r.name,
      table: r.table,
      size: r.size,
      lastUsed: null,
      impact: 'medium',
      recommendation: 'Drop if confirmed unused under production workload'
    }));

    const duplicateIndexes: DuplicateIndex[] = duplicateIdxResult.rows.map(r => ({
      indexes: r.index_names,
      table: r.table_name,
      columns: r.cols,
      wastedSpace: 'Unknown',
      recommendation: 'Drop redundant index(es) keeping the most appropriate'
    }));

    const oversizedIndexes: OversizedIndex[] = oversizedIdxResult.rows.map(r => ({
      name: r.name,
      table: r.table,
      size: toPretty(Number(r.bytes)),
      suggestion: 'Consider partial or composite index, or review necessity',
      optimizationPotential: 'Storage reduction and faster writes'
    }));

    const missingIndexes: MissingIndex[] = missingIdxResult.rows.map((r: any) => ({
      table: r.table,
      columns: ['id'],
      reason: 'High sequential scans relative to index scans',
      estimatedImpact: 'high',
      suggestedSql: `-- Consider adding indexes on frequently filtered/joined columns for table ${r.table}`,
      performanceGain: 'Lower buffer reads and faster lookups'
    }));

    const totalIndexes = Number(totalIndexesResult.rows[0].count) || 0;
    const indexEfficiencyScore = Math.max(0, 9.5 - (unusedIndexes.length * 0.3) - (duplicateIndexes.length * 0.2));

    return {
      totalIndexes,
      unusedIndexes,
      missingIndexes,
      duplicateIndexes,
      oversizedIndexes,
      indexEfficiencyScore,
      recommendations: []
    };
  }

  private async detectPerformanceIssues(): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];

    // Lock contention: long waits
    const locks = await this.client.query(`
      SELECT mode, COUNT(*) as cnt
      FROM pg_locks
      GROUP BY mode
      HAVING COUNT(*) > 10
    `);
    if (locks.rows.length > 0) {
      issues.push({
        type: 'lock_contention',
        severity: 'medium',
        description: 'High number of locks detected; potential contention',
        impact: 'Queries may wait longer due to concurrent operations',
        solution: 'Investigate long-running transactions, ensure indexes support write patterns',
        estimatedImprovement: 'Reduced wait times'
      });
    }

    // Outdated stats (last analyze)
    const statsResult = await this.client.query(`
      SELECT relname as tablename
      FROM pg_stat_user_tables
      WHERE last_analyze IS NULL OR last_analyze < NOW() - INTERVAL '7 days'
    `);
    statsResult.rows.forEach(r => {
      issues.push({
        type: 'poor_statistics',
        severity: 'medium',
        description: `Table '${r.tablename}' has outdated statistics`,
        impact: 'Planner may choose suboptimal plans',
        solution: 'Run ANALYZE or autovacuum tuning',
        sqlFix: `ANALYZE ${r.tablename};`,
        estimatedImprovement: 'More accurate planning'
      });
    });

    return issues;
  }

  private async analyzeCosts(): Promise<DatabaseCostAnalysis> {
    // Rough, but more realistic estimates using system catalogs
    const sizeResult = await this.client.query(
      `SELECT pg_database_size(current_database()) AS total_bytes`
    );
    const indexBytesResult = await this.client.query(
      `SELECT COALESCE(SUM(pg_relation_size(indexrelid)),0) AS index_bytes FROM pg_stat_user_indexes`
    );
    const tableBytesResult = await this.client.query(
      `SELECT COALESCE(SUM(pg_total_relation_size(relid)),0) AS table_bytes FROM pg_stat_user_tables`
    );

    const totalBytes: number = parseInt(sizeResult.rows[0].total_bytes) || 0;
    const indexBytes: number = parseInt(indexBytesResult.rows[0].index_bytes) || 0;
    const tableBytes: number = parseInt(tableBytesResult.rows[0].table_bytes) || 0;
    const dataBytes = Math.max(tableBytes - indexBytes, 0);

    // Assume 10% bloat reclaim potential as a default heuristic
    const wastedBytes = Math.floor(tableBytes * 0.1);

    // Very simple cloud-like pricing assumptions
    const pricePerGBStorage = 0.10; // $/GB-month
    const monthlyStorageCost = (totalBytes / (1024 ** 3)) * pricePerGBStorage;
    const estimatedCompute = 50; // baseline
    const estimatedMaintenance = 20; // baseline

    const storageSavings = (wastedBytes / (1024 ** 3)) * pricePerGBStorage;
    const performanceSavings = 25; // nominal conservation from tuning
    const monthlySavings = storageSavings + performanceSavings;

    const formatBytes = (bytes: number): string => {
      const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];
      let size = bytes;
      let unitIndex = 0;
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }
      return `${size.toFixed(2)} ${units[unitIndex]}`;
    };

    return {
      storageUsage: {
        totalSize: formatBytes(totalBytes),
        dataSize: formatBytes(dataBytes),
        indexSize: formatBytes(indexBytes),
        wastedSpace: formatBytes(wastedBytes)
      },
      estimatedCosts: {
        storage: Number(monthlyStorageCost.toFixed(2)),
        compute: estimatedCompute,
        maintenance: estimatedMaintenance
      },
      optimizationSavings: {
        storage: Number(storageSavings.toFixed(2)),
        performance: performanceSavings,
        monthly: Number(monthlySavings.toFixed(2))
      }
    };
  }

  private generateOptimizationRecommendations(
    schemaHealth: SchemaHealthScore,
    indexAnalysis: IndexAnalysis,
    tableAnalysis: TableAnalysis,
    performanceIssues: PerformanceIssue[],
    securityAnalysis: SecurityAnalysis
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    if (tableAnalysis.tablesWithBloat.length > 0) {
      recommendations.push({
        category: 'maintenance',
        priority: 'medium',
        title: 'Reclaim space from bloated tables',
        description: `${tableAnalysis.tablesWithBloat.length} tables show signs of bloat.`,
        estimatedImpact: 'Reduce storage footprint and improve scan performance',
        implementation: 'Schedule VACUUM FULL during low-traffic windows or use pg_repack.',
        sqlCommands: tableAnalysis.tablesWithBloat.map(t => `VACUUM (FULL, ANALYZE) ${t.tableName};`),
        timeToImplement: '4-8 hours',
        riskLevel: 'medium'
      });
    }

    if (securityAnalysis.vulnerabilities.length > 0) {
      recommendations.push({
        category: 'security',
        priority: 'high',
        title: 'Address security vulnerabilities',
        description: `Resolve ${securityAnalysis.vulnerabilities.length} security findings (RLS/public access/permissions).`,
        estimatedImpact: 'Prevent data exposure and improve compliance',
        implementation: 'Enable RLS where appropriate and remove PUBLIC privileges.',
        sqlCommands: securityAnalysis.vulnerabilities
          .map(v => v.solution)
          .filter(Boolean) as string[],
        timeToImplement: '1-3 days',
        riskLevel: 'high'
      });
    }

    if (indexAnalysis.unusedIndexes.length > 0) {
      recommendations.push({
        category: 'storage',
        priority: 'medium',
        title: 'Drop unused indexes',
        description: `${indexAnalysis.unusedIndexes.length} indexes are not used by queries.`,
        estimatedImpact: 'Reduce storage and speed up writes',
        implementation: 'Verify usage and drop unused indexes.',
        sqlCommands: indexAnalysis.unusedIndexes.map(u => `DROP INDEX IF EXISTS ${u.name};`),
        timeToImplement: '2-4 hours',
        riskLevel: 'low'
      });
    }

    return recommendations;
  }

  private generateMaintenanceRecommendations(): MaintenanceRecommendation[] {
    return [
      {
        task: 'ANALYZE',
        frequency: 'daily',
        importance: 'high',
        description: 'Update planner statistics for accurate query plans',
        command: 'ANALYZE;',
        automation: 'Cron daily during off-peak hours'
      },
      {
        task: 'VACUUM',
        frequency: 'weekly',
        importance: 'medium',
        description: 'Reclaim storage and keep visibility maps healthy',
        command: 'VACUUM;',
        automation: 'Weekly cron with low lock contention window'
      },
      {
        task: 'REINDEX',
        frequency: 'monthly',
        importance: 'medium',
        description: 'Rebuild bloated indexes to improve performance',
        command: 'REINDEX DATABASE current_database();',
        automation: 'Monthly maintenance window with monitoring'
      }
    ];
  }

  /**
   * Generate AI insights using OpenAI API
   */
  private async generateAIInsights(data: any): Promise<AIInsights> {
    // If no API key, produce heuristic insights derived from analysis
    if (!this.openaiApiKey) {
      const vulnCount = data.securityAnalysis?.vulnerabilities?.length || 0;
      const bloatCount = data.tableAnalysis?.tablesWithBloat?.length || 0;
      const missingIdxCount = data.indexAnalysis?.missingIndexes?.length || 0;
      const unusedIdxCount = data.indexAnalysis?.unusedIndexes?.length || 0;
      const priorityRecommendations: string[] = [];
      if (vulnCount > 0) priorityRecommendations.push('Enable RLS and remove PUBLIC grants on sensitive tables');
      if (bloatCount > 0) priorityRecommendations.push('Run ANALYZE and schedule VACUUM/pg_repack for bloated tables');
      if (missingIdxCount > 0) priorityRecommendations.push('Create indexes on high-traffic FK and filter columns');
      if (unusedIdxCount > 0) priorityRecommendations.push('Drop unused/duplicate indexes to reduce write overhead');

      return {
        overallAssessment: 'Heuristic insights: address security first, then performance and storage wins',
        priorityRecommendations,
        riskAnalysis: vulnCount > 0 ? 'Elevated risk due to access control gaps (RLS/public access)' : 'Low to moderate security risk',
        performancePredictions: missingIdxCount > 0 ? 'Indexing will significantly improve join/filter queries' : 'Tuning and maintenance will yield incremental gains',
        costOptimizationSuggestions: bloatCount > 0 ? ['Reclaim space by bloat cleanup to reduce storage costs'] : ['Optimize indexes to reduce overhead'],
        implementationRoadmap: [
          'Week 1: Fix critical security items (RLS, PUBLIC revokes)',
          'Week 2: Add indexes for FK and frequent filters',
          'Week 3: Run maintenance (ANALYZE/VACUUM) and recheck stats',
          'Week 4: Review triggers and configuration tuning'
        ]
      };
    }

    try {
      const client = new OpenAI({ apiKey: this.openaiApiKey });
      const summary = {
        score: data.schemaHealth?.overall,
        securityIssues: data.securityAnalysis?.vulnerabilities?.slice(0, 10),
        bloatTables: data.tableAnalysis?.tablesWithBloat?.slice(0, 10),
        missingIndexes: data.indexAnalysis?.missingIndexes?.slice(0, 10),
        unusedIndexes: data.indexAnalysis?.unusedIndexes?.slice(0, 10),
        performanceIssues: data.performanceIssues?.slice(0, 10)
      };

      const prompt = `You are a senior database performance and security engineer. Given this JSON summary of a Postgres database audit, produce:
1) A 2-3 sentence overall assessment
2) A prioritized list (3-6 bullets) of concrete actions
3) A short risk analysis (security and performance)
4) A 1-2 sentence performance outlook
5) 2-3 cost optimization suggestions
6) A 4-step week-by-week implementation roadmap
Output strictly in JSON with keys: overallAssessment, priorityRecommendations, riskAnalysis, performancePredictions, costOptimizationSuggestions, implementationRoadmap.

JSON:
${JSON.stringify(summary, null, 2)}
`;

      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'You are a precise assistant for database optimization.' },
          { role: 'user', content: prompt }
        ]
      });

      const content = completion.choices?.[0]?.message?.content || '';
      try {
        const parsed = JSON.parse(content);
        return {
          overallAssessment: parsed.overallAssessment,
          priorityRecommendations: parsed.priorityRecommendations,
          riskAnalysis: parsed.riskAnalysis,
          performancePredictions: parsed.performancePredictions,
          costOptimizationSuggestions: parsed.costOptimizationSuggestions,
          implementationRoadmap: parsed.implementationRoadmap
        };
      } catch {
        // Fallback: embed raw content as assessment
        return {
          overallAssessment: content.slice(0, 500),
          priorityRecommendations: [],
          riskAnalysis: 'See overall assessment',
          performancePredictions: 'See overall assessment',
          costOptimizationSuggestions: [],
          implementationRoadmap: []
        };
      }
    } catch (e) {
      // Final fallback
      return {
        overallAssessment: 'AI insights unavailable; showing heuristic guidance based on findings',
        priorityRecommendations: ['Fix RLS/public access', 'Create FK/filter indexes', 'Run VACUUM/ANALYZE and review oversized indexes'],
        riskAnalysis: 'Moderate; address access control first',
        performancePredictions: 'Indexing and maintenance should improve latency',
        costOptimizationSuggestions: ['Reduce storage via bloat cleanup', 'Drop unused indexes'],
        implementationRoadmap: ['Week 1: Security', 'Week 2: Indexing', 'Week 3: Maintenance', 'Week 4: Review & retest']
      };
    }
  }
}