/**
 * Enhanced SQL Database Analyzer
 * 
 * A comprehensive, AI-powered SQL database analyzer that provides detailed health audits,
 * security analysis, performance optimization recommendations, and beautiful HTML reports.
 * 
 * @author Prince Vasoya
 * @version 1.1.0
 * @license MIT
 */

// Main exports for the NPM package
export { 
  EnhancedSQLAnalyzer as default,
  EnhancedSQLAnalyzer,
  type AnalysisSummary,
  type AnalysisOptions
} from './enhanced-sql-analyzer';

export {
  EnhancedDatabaseHealthAuditor,
  type EnhancedDatabaseHealthReport,
  type TableAnalysis,
  type TriggerAnalysis,
  type ProcedureAnalysis,
  type SecurityAnalysis,
  type AIInsights,
  type DatabaseInfo,
  type SchemaHealthScore,
  type IndexAnalysis,
  type PerformanceIssue,
  type OptimizationRecommendation,
  type DatabaseCostAnalysis,
  type MaintenanceRecommendation
} from './enhanced-database-auditor';

export {
  EnhancedReportGenerator
} from './enhanced-report-generator';

export {
  ConfigManager,
  configPresets,
  defaultConfig,
  type SqlAnalyzerConfig
} from './config';

// Legacy exports for backward compatibility
export { SQLOptimizer } from './optimizer';
export { SchemaAnalyzer } from './schema-analyzer';
export { IndexSuggestor } from './index-suggestor';
export { DatabaseHealthAuditor } from './database-health-auditor';
export { HealthReportGenerator } from './health-report-generator';

// Utility exports
export { 
  type AnalysisResult,
  type BatchAnalysisResult,
  type Suggestion,
  type SchemaAnalysis
} from './types';

/**
 * Quick analysis function for simple use cases
 * 
 * @example
 * ```typescript
 * import { quickAnalysis } from '@sql-analyzer/enhanced';
 * 
 * const summary = await quickAnalysis('postgresql://localhost/mydb', {
 *   includeAI: true,
 *   format: 'html'
 * });
 * 
 * console.log(`Health Score: ${summary.overallScore}/10`);
 * ```
 */
export async function quickAnalysis(
  connectionString: string,
  options?: {
    format?: 'cli' | 'html' | 'json';
    includeAI?: boolean;
    outputPath?: string;
  }
) {
  const { EnhancedSQLAnalyzer } = await import('./enhanced-sql-analyzer');
  return EnhancedSQLAnalyzer.quickAnalysis(connectionString, options);
}

/**
 * CI/CD analysis function optimized for automated environments
 * 
 * @example
 * ```typescript
 * import { ciAnalysis } from '@sql-analyzer/enhanced';
 * 
 * const result = await ciAnalysis('postgresql://localhost/mydb');
 * if (!result.passed) {
 *   console.error(`Analysis failed with ${result.criticalIssues} critical issues`);
 *   process.exit(1);
 * }
 * ```
 */
export async function ciAnalysis(connectionString: string) {
  const { EnhancedSQLAnalyzer } = await import('./enhanced-sql-analyzer');
  return EnhancedSQLAnalyzer.ciAnalysis(connectionString);
}

/**
 * Create analyzer instance with configuration
 * 
 * @example
 * ```typescript
 * import { createAnalyzer, configPresets } from '@sql-analyzer/enhanced';
 * 
 * const analyzer = createAnalyzer('postgresql://localhost/mydb', {
 *   preset: 'comprehensive',
 *   customConfig: {
 *     ai: { enabled: true, apiKey: 'your-key' }
 *   }
 * });
 * 
 * const report = await analyzer.analyze();
 * ```
 */
export function createAnalyzer(
  connectionConfig: any,
  options?: {
    preset?: keyof typeof import('./config').configPresets;
    customConfig?: Partial<import('./config').SqlAnalyzerConfig>;
    format?: 'cli' | 'html' | 'json';
    includeAI?: boolean;
    outputPath?: string;
  }
) {
  const { EnhancedSQLAnalyzer } = require('./enhanced-sql-analyzer');
  return new EnhancedSQLAnalyzer(connectionConfig, options);
}

/**
 * Version information
 */
export const version = '1.1.0';

/**
 * Package metadata
 */
export const packageInfo = {
  name: '@vasoyaprince14/sql-analyzer',
  version: '1.1.0',
  description: 'Enhanced SQL database analyzer with AI-powered insights',
  author: 'Prince Vasoya',
  license: 'MIT',
  repository: 'https://github.com/vasoyaprince14/sql-optimizer',
  homepage: 'https://github.com/vasoyaprince14/sql-optimizer#readme'
};

// Default export for CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  const { EnhancedSQLAnalyzer } = require('./enhanced-sql-analyzer');
  module.exports = EnhancedSQLAnalyzer;
  module.exports.default = EnhancedSQLAnalyzer;
  module.exports.EnhancedSQLAnalyzer = EnhancedSQLAnalyzer;
  module.exports.quickAnalysis = quickAnalysis;
  module.exports.ciAnalysis = ciAnalysis;
  module.exports.createAnalyzer = createAnalyzer;
  module.exports.version = version;
  module.exports.packageInfo = packageInfo;
}