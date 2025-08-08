export interface OptimizerConfig {
  databaseUrl: string;
  openaiApiKey?: string;
  maxExecutionTime?: number;
  benchmarkIterations?: number;
  enableColors?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface PerformanceMetrics {
  executionTime: number;
  rowsReturned: number;
  bufferUsage?: string;
  cacheHitRatio: number;
  planningTime?: number;
  actualTime?: number;
  estimatedCost?: number;
  actualCost?: number;
}

export interface QueryIssue {
  type: 'sequential_scan' | 'missing_index' | 'high_buffer_usage' | 'slow_query' | 'inefficient_join' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  table?: string;
  column?: string;
  suggestion?: string;
}

export interface Suggestion {
  type: 'index' | 'query_rewrite' | 'schema_change' | 'configuration' | 'other';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  sql?: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
}

export interface AIRecommendation {
  category: 'performance' | 'indexing' | 'query_structure' | 'best_practices';
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  implementation?: string;
}

export interface AnalysisResult {
  query: string;
  performance: PerformanceMetrics;
  issues: QueryIssue[];
  suggestions: Suggestion[];
  aiRecommendations?: AIRecommendation[];
  executionPlan?: any;
  timestamp: Date;
  duration: number;
}

export interface BenchmarkResult {
  query: string;
  iterations: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  results: PerformanceMetrics[];
}

export interface SchemaAnalysis {
  tables: TableInfo[];
  relationships: Relationship[];
  recommendations: SchemaRecommendation[];
  normalizationScore: number;
  performanceScore: number;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  rowCount?: number;
  size?: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencedTable?: string;
  referencedColumn?: string;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'spgist' | 'brin';
  unique: boolean;
  partial?: boolean;
}

export interface Relationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: 'one_to_one' | 'one_to_many' | 'many_to_many';
}

export interface SchemaRecommendation {
  type: 'index' | 'normalization' | 'data_type' | 'constraint' | 'other';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  sql?: string;
  impact: 'low' | 'medium' | 'high';
}

export interface ReportOptions {
  format: 'cli' | 'json' | 'html';
  includeExecutionPlan?: boolean;
  includeAIRecommendations?: boolean;
  includeBenchmarks?: boolean;
  outputPath?: string;
}

export interface BatchAnalysisResult {
  queries: AnalysisResult[];
  summary: {
    totalQueries: number;
    slowQueries: number;
    issuesFound: number;
    suggestionsGenerated: number;
    averageExecutionTime: number;
  };
  recommendations: {
    indexes: Suggestion[];
    queryRewrites: Suggestion[];
    schemaChanges: Suggestion[];
  };
} 