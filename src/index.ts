import { SQLOptimizer } from './optimizer';
import { QueryAnalyzer } from './analyzer';
import { AISuggestions } from './ai-suggestions';
import { IndexSuggestor } from './index-suggestor';
import { QueryRewriter } from './query-rewriter';
import { Benchmarker } from './benchmarker';
import { Reporter } from './reporter';
import { SchemaAnalyzer } from './schema-analyzer';

// Main exports
export { SQLOptimizer } from './optimizer';
export { QueryAnalyzer } from './analyzer';
export { AISuggestions } from './ai-suggestions';
export { IndexSuggestor } from './index-suggestor';
export { QueryRewriter } from './query-rewriter';
export { Benchmarker } from './benchmarker';
export { Reporter } from './reporter';
export { SchemaAnalyzer } from './schema-analyzer';

// Types
export type {
  AnalysisResult,
  PerformanceMetrics,
  QueryIssue,
  Suggestion,
  AIRecommendation,
  BenchmarkResult,
  SchemaAnalysis,
  OptimizerConfig
} from './types';

// Default export for convenience
export default SQLOptimizer;

// Utility functions
export { formatQuery, parseSQL, validateConnection } from './utils'; 