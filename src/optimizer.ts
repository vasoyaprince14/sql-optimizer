import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { QueryAnalyzer } from './analyzer';
import { AISuggestions } from './ai-suggestions';
import { IndexSuggestor } from './index-suggestor';
import { QueryRewriter } from './query-rewriter';
import { Benchmarker } from './benchmarker';
import { Reporter } from './reporter';
import { SchemaAnalyzer } from './schema-analyzer';
import { QueryComplexityAnalyzer } from './query-complexity-analyzer';
import { CostEstimator } from './cost-estimator';
import { SecurityAnalyzer } from './security-analyzer';
import { DatabaseHealthAuditor } from './database-health-auditor';
import { HealthReportGenerator } from './health-report-generator';
import { 
  OptimizerConfig, 
  AnalysisResult, 
  SchemaAnalysis, 
  BenchmarkResult,
  BatchAnalysisResult,
  ReportOptions 
} from './types';

dotenv.config();

export class SQLOptimizer {
  private client: Client;
  private config: OptimizerConfig;
  private analyzer: QueryAnalyzer;
  private aiSuggestions: AISuggestions;
  private indexSuggestor: IndexSuggestor;
  private queryRewriter: QueryRewriter;
  private benchmarker: Benchmarker;
  private reporter: Reporter;
  private schemaAnalyzer: SchemaAnalyzer;
  private complexityAnalyzer: QueryComplexityAnalyzer;
  private costEstimator: CostEstimator;
  private securityAnalyzer: SecurityAnalyzer;
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

    this.analyzer = new QueryAnalyzer(this.client);
    this.aiSuggestions = new AISuggestions(this.config.openaiApiKey);
    this.indexSuggestor = new IndexSuggestor(this.client);
    this.queryRewriter = new QueryRewriter();
    this.benchmarker = new Benchmarker(this.client);
    this.reporter = new Reporter();
    this.schemaAnalyzer = new SchemaAnalyzer(this.client);
    this.complexityAnalyzer = new QueryComplexityAnalyzer();
    this.costEstimator = new CostEstimator();
    this.securityAnalyzer = new SecurityAnalyzer();
    this.healthAuditor = new DatabaseHealthAuditor(this.client);
    this.healthReporter = new HealthReportGenerator();
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    try {
      await this.client.connect();
      console.log('✅ Connected to database successfully');
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.end();
      console.log('✅ Disconnected from database');
    } catch (error) {
      console.error('Error disconnecting from database:', error);
    }
  }

  /**
   * Analyze a single SQL query
   */
  async analyzeQuery(sql: string, enableAI: boolean = false): Promise<AnalysisResult> {
    try {
      // Basic query analysis
      const result = await this.analyzer.analyze(sql);
      
      // Generate index suggestions
      const indexSuggestions = await this.indexSuggestor.suggestIndexes(result);
      result.suggestions.push(...indexSuggestions);

      // Generate query rewrite suggestions
      const rewriteSuggestions = await this.queryRewriter.suggestRewrites(result);
      result.suggestions.push(...rewriteSuggestions);

      // AI-powered suggestions (if enabled)
      if (enableAI && this.config.openaiApiKey) {
        const aiRecommendations = await this.aiSuggestions.getRecommendations(result);
        result.aiRecommendations = aiRecommendations;
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to analyze query: ${error}`);
    }
  }

  /**
   * Analyze multiple queries in batch
   */
  async analyzeBatch(queries: string[], enableAI: boolean = false): Promise<BatchAnalysisResult> {
    const results: AnalysisResult[] = [];
    
    for (const query of queries) {
      try {
        const result = await this.analyzeQuery(query, enableAI);
        results.push(result);
      } catch (error) {
        console.error(`Failed to analyze query: ${error}`);
      }
    }

    // Generate summary
    const summary = this.generateBatchSummary(results);
    
    // Generate batch recommendations
    const recommendations = await this.generateBatchRecommendations(results);

    return {
      queries: results,
      summary,
      recommendations
    };
  }

  /**
   * Analyze database schema
   */
  async analyzeSchema(): Promise<SchemaAnalysis> {
    try {
      return await this.schemaAnalyzer.analyze();
    } catch (error) {
      throw new Error(`Failed to analyze schema: ${error}`);
    }
  }

  /**
   * Benchmark query performance
   */
  async benchmarkQuery(sql: string, iterations: number = 5): Promise<BenchmarkResult> {
    try {
      return await this.benchmarker.benchmark(sql, iterations);
    } catch (error) {
      throw new Error(`Failed to benchmark query: ${error}`);
    }
  }

  /**
   * Generate optimization suggestions for a query
   */
  async suggestOptimizations(sql: string): Promise<import('./types').Suggestion[]> {
    try {
      const result = await this.analyzeQuery(sql);
      return result.suggestions;
    } catch (error) {
      throw new Error(`Failed to generate suggestions: ${error}`);
    }
  }

  /**
   * Generate a report for analysis results
   */
  async generateReport(
    result: AnalysisResult | BatchAnalysisResult, 
    options: ReportOptions = { format: 'cli' }
  ): Promise<string> {
    try {
      return await this.reporter.generateReport(result, options);
    } catch (error) {
      throw new Error(`Failed to generate report: ${error}`);
    }
  }

  /**
   * Generate comprehensive analysis with all features
   */
  async generateComprehensiveAnalysis(sql: string): Promise<{
    performance: AnalysisResult;
    complexity: string;
    cost: string;
    security: string;
  }> {
    try {
      // Run performance analysis first (this is the expensive operation)
      const performance = await this.analyzeQuery(sql);
      
      // Run other analyses in parallel since they're just processing the result
      const [complexity, cost, security] = await Promise.all([
        Promise.resolve(this.complexityAnalyzer.generateComplexityReport(performance)),
        Promise.resolve(this.costEstimator.generateCostReport(performance)),
        Promise.resolve(this.securityAnalyzer.generateSecurityReport(performance))
      ]);
      
      return {
        performance,
        complexity,
        cost,
        security
      };
    } catch (error) {
      throw new Error(`Failed to generate comprehensive analysis: ${error}`);
    }
  }

  /**
   * Perform comprehensive database health audit
   */
  async performHealthAudit(format: 'cli' | 'json' | 'html' = 'cli'): Promise<string> {
    try {
      const healthReport = await this.healthAuditor.performHealthAudit();
      
      switch (format) {
        case 'json':
          return this.healthReporter.generateJSONReport(healthReport);
        case 'html':
          return this.healthReporter.generateHTMLReport(healthReport);
        default:
          return this.healthReporter.generateCLIReport(healthReport);
      }
    } catch (error) {
      throw new Error(`Failed to perform health audit: ${error}`);
    }
  }

  /**
   * Validate database connection
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.client.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get database information
   */
  async getDatabaseInfo(): Promise<{ version: string; size: string; tables: number }> {
    try {
      const versionResult = await this.client.query('SELECT version()');
      const sizeResult = await this.client.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      const tablesResult = await this.client.query(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);

      return {
        version: versionResult.rows[0].version,
        size: sizeResult.rows[0].size,
        tables: parseInt(tablesResult.rows[0].count)
      };
    } catch (error) {
      throw new Error(`Failed to get database info: ${error}`);
    }
  }

  /**
   * Generate batch summary
   */
  private generateBatchSummary(results: AnalysisResult[]): BatchAnalysisResult['summary'] {
    const totalQueries = results.length;
    const slowQueries = results.filter(r => r.performance.executionTime > 1000).length;
    const issuesFound = results.reduce((sum, r) => sum + r.issues.length, 0);
    const suggestionsGenerated = results.reduce((sum, r) => sum + r.suggestions.length, 0);
    const averageExecutionTime = results.reduce((sum, r) => sum + r.performance.executionTime, 0) / totalQueries;

    return {
      totalQueries,
      slowQueries,
      issuesFound,
      suggestionsGenerated,
      averageExecutionTime
    };
  }

  /**
   * Generate batch recommendations
   */
  private async generateBatchRecommendations(results: AnalysisResult[]): Promise<BatchAnalysisResult['recommendations']> {
    const allSuggestions = results.flatMap(r => r.suggestions);
    
    const indexes = allSuggestions.filter(s => s.type === 'index');
    const queryRewrites = allSuggestions.filter(s => s.type === 'query_rewrite');
    const schemaChanges = allSuggestions.filter(s => s.type === 'schema_change');

    return {
      indexes,
      queryRewrites,
      schemaChanges
    };
  }
} 