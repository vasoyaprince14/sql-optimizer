import { Client } from 'pg';
import { IndexSuggestor } from './index-suggestor';
import { SchemaAnalyzer } from './schema-analyzer';
import { DatabaseHealthAuditor } from './database-health-auditor';
import { HealthReportGenerator } from './health-report-generator';
import { 
  OptimizerConfig, 
  AnalysisResult, 
  SchemaAnalysis
} from './types';

/**
 * Legacy SQL Optimizer class for backward compatibility
 * For new projects, use EnhancedSQLAnalyzer instead
 * 
 * @deprecated Use EnhancedSQLAnalyzer for new implementations
 */
export class SQLOptimizer {
  private client: Client;
  private config: OptimizerConfig;
  private indexSuggestor: IndexSuggestor;
  private schemaAnalyzer: SchemaAnalyzer;
  private healthAuditor: DatabaseHealthAuditor;
  private healthReporter: HealthReportGenerator;

  constructor(config: OptimizerConfig) {
    this.config = {
      maxExecutionTime: 30000,
      benchmarkIterations: 5,
      enableColors: true,
      logLevel: 'info',
      ...config
    };

    this.client = new Client({
      connectionString: this.config.databaseUrl,
    });

    // Initialize remaining components
    this.indexSuggestor = new IndexSuggestor(this.client);
    this.schemaAnalyzer = new SchemaAnalyzer(this.client);
    this.healthAuditor = new DatabaseHealthAuditor(this.client);
    this.healthReporter = new HealthReportGenerator();
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.end();
  }

  /**
   * Simplified query analysis
   * @deprecated Use EnhancedSQLAnalyzer.analyze() instead
   */
  async analyzeQuery(sql: string): Promise<AnalysisResult> {
    try {
      // Basic EXPLAIN ANALYZE
      const explainResult = await this.client.query(`EXPLAIN ANALYZE ${sql}`);
      
      // Create a minimal AnalysisResult for index suggestions
      const tempResult: AnalysisResult = {
        query: sql,
        performance: {
          executionTime: 0,
          rowsReturned: 0,
          bufferUsage: undefined,
          cacheHitRatio: 0
        },
        issues: [],
        suggestions: [],
        timestamp: new Date(),
        duration: 0
      };
      
      // Get index suggestions
      const indexSuggestions = await this.indexSuggestor.suggestIndexes(tempResult);

      return {
        query: sql,
        performance: {
          executionTime: 0,
          rowsReturned: 0,
          bufferUsage: undefined,
          cacheHitRatio: 0,
          planningTime: 0,
          estimatedCost: 0
        },
        issues: [],
        suggestions: indexSuggestions,
        executionPlan: explainResult.rows.map(row => row['QUERY PLAN']).join('\n'),
        timestamp: new Date(),
        duration: 0
      };
    } catch (error: any) {
      throw new Error(`Query analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze database schema
   * @deprecated Use EnhancedSQLAnalyzer for comprehensive analysis
   */
  async analyzeSchema(): Promise<SchemaAnalysis> {
    return await this.schemaAnalyzer.analyze();
  }

  /**
   * Generate index suggestions
   * @deprecated Use EnhancedSQLAnalyzer for comprehensive analysis
   */
  async suggestIndexes(sql?: string): Promise<import('./types').Suggestion[]> {
    if (sql) {
      const tempResult: AnalysisResult = {
        query: sql,
        performance: {
          executionTime: 0,
          rowsReturned: 0,
          bufferUsage: undefined,
          cacheHitRatio: 0
        },
        issues: [],
        suggestions: [],
        timestamp: new Date(),
        duration: 0
      };
      return await this.indexSuggestor.suggestIndexes(tempResult);
    } else {
      // Return empty array for now - comprehensive analysis should use EnhancedSQLAnalyzer
      return [];
    }
  }

  /**
   * Perform health audit
   * @deprecated Use EnhancedSQLAnalyzer for comprehensive analysis
   */
  async performHealthAudit(): Promise<any> {
    const healthReport = await this.healthAuditor.performHealthAudit();
    return healthReport;
  }

  /**
   * Generate report
   * @deprecated Use EnhancedSQLAnalyzer for comprehensive reports
   */
  async generateReport(result: any, options: { format?: string } = {}): Promise<string> {
    const format = options.format || 'cli';
    
    if (typeof result === 'object' && result.databaseInfo) {
      // Health report
      switch (format) {
        case 'json':
          return this.healthReporter.generateJSONReport(result);
        case 'html':
          return this.healthReporter.generateHTMLReport(result);
        default:
          return this.healthReporter.generateCLIReport(result);
      }
    } else {
      // Analysis result - simplified report
      const report = `
SQL Analysis Report (Legacy)
============================

SQL: ${result.query}
Execution Time: ${result.performance?.executionTime}ms
Planning Time: ${result.performance?.planningTime}ms

Suggestions: ${result.suggestions?.length} found
Issues: ${result.issues?.length} found

Note: This is a simplified legacy report. 
For comprehensive analysis, use EnhancedSQLAnalyzer instead.
`;
      return report;
    }
  }

  /**
   * Get configuration
   */
  getConfig(): OptimizerConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<OptimizerConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}