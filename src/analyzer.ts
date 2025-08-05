import { Client } from 'pg';
import { AnalysisResult, PerformanceMetrics, QueryIssue, Suggestion } from './types';

export class QueryAnalyzer {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Analyze a SQL query using EXPLAIN ANALYZE
   */
  async analyze(sql: string): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Run EXPLAIN ANALYZE
      const explainResult = await this.runExplainAnalyze(sql);
      
      // Parse performance metrics
      const performance = this.parsePerformanceMetrics(explainResult);
      
      // Detect issues
      const issues = this.detectIssues(explainResult, performance);
      
      // Generate basic suggestions
      const suggestions = this.generateBasicSuggestions(issues, performance);
      
      const duration = Date.now() - startTime;
      
      return {
        query: sql,
        performance,
        issues,
        suggestions,
        executionPlan: explainResult,
        timestamp: new Date(),
        duration
      };
    } catch (error) {
      throw new Error(`Query analysis failed: ${error}`);
    }
  }

  /**
   * Run EXPLAIN ANALYZE on the query
   */
  private async runExplainAnalyze(sql: string): Promise<any> {
    try {
      const result = await this.client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
      return result.rows[0]['QUERY PLAN'];
    } catch (error) {
      throw new Error(`EXPLAIN ANALYZE failed: ${error}`);
    }
  }

  /**
   * Parse performance metrics from EXPLAIN ANALYZE result
   */
  private parsePerformanceMetrics(executionPlan: any): PerformanceMetrics {
    const plan = executionPlan[0];
    
    // Extract timing information
    const planningTime = plan['Planning Time'] || 0;
    const executionTime = plan['Execution Time'] || 0;
    const actualTime = executionTime - planningTime;
    
    // Extract buffer information
    const sharedHitBlocks = plan['Shared Hit Blocks'] || 0;
    const sharedReadBlocks = plan['Shared Read Blocks'] || 0;
    const sharedDirtiedBlocks = plan['Shared Dirtied Blocks'] || 0;
    const sharedWrittenBlocks = plan['Shared Written Blocks'] || 0;
    
    const totalBlocks = sharedHitBlocks + sharedReadBlocks;
    const cacheHitRatio = totalBlocks > 0 ? (sharedHitBlocks / totalBlocks) * 100 : 0;
    
    // Calculate buffer usage in MB (assuming 8KB blocks)
    const bufferUsageMB = (totalBlocks * 8) / 1024;
    const bufferUsage = `${bufferUsageMB.toFixed(1)}MB`;
    
    // Estimate rows returned (this is approximate)
    const rowsReturned = this.estimateRowsReturned(executionPlan);
    
    return {
      executionTime,
      rowsReturned,
      bufferUsage,
      cacheHitRatio: Math.round(cacheHitRatio),
      planningTime,
      actualTime,
      estimatedCost: plan['Total Cost'],
      actualCost: executionTime
    };
  }

  /**
   * Estimate rows returned from execution plan
   */
  private estimateRowsReturned(executionPlan: any): number {
    // This is a simplified estimation
    // In a real implementation, you'd traverse the plan tree more carefully
    let totalRows = 0;
    
    const traversePlan = (node: any) => {
      if (node['Actual Rows']) {
        totalRows = Math.max(totalRows, node['Actual Rows']);
      }
      
      if (node['Plans']) {
        node['Plans'].forEach(traversePlan);
      }
    };
    
    traversePlan(executionPlan[0]);
    return totalRows;
  }

  /**
   * Detect performance issues from execution plan
   */
  private detectIssues(executionPlan: any, performance: PerformanceMetrics): QueryIssue[] {
    const issues: QueryIssue[] = [];
    
    // Check for slow queries
    if (performance.executionTime > 1000) {
      issues.push({
        type: 'slow_query',
        severity: performance.executionTime > 5000 ? 'critical' : 'high',
        message: `Query execution time (${performance.executionTime}ms) is above recommended threshold`,
        suggestion: 'Consider adding indexes or rewriting the query'
      });
    }
    
    // Check for sequential scans
    const sequentialScans = this.findSequentialScans(executionPlan);
    sequentialScans.forEach(scan => {
      issues.push({
        type: 'sequential_scan',
        severity: 'high',
        message: `Sequential scan detected on table: ${scan.table}`,
        table: scan.table,
        suggestion: `Consider adding an index on ${scan.table}`
      });
    });
    
    // Check for high buffer usage
    if (performance.cacheHitRatio < 80) {
      issues.push({
        type: 'high_buffer_usage',
        severity: performance.cacheHitRatio < 50 ? 'critical' : 'medium',
        message: `Low cache hit ratio (${performance.cacheHitRatio}%)`,
        suggestion: 'Consider increasing shared_buffers or optimizing query'
      });
    }
    
    // Check for missing indexes
    const missingIndexes = this.findMissingIndexes(executionPlan);
    missingIndexes.forEach(index => {
      issues.push({
        type: 'missing_index',
        severity: 'medium',
        message: `Missing index detected for: ${index.table}.${index.column}`,
        table: index.table,
        column: index.column,
        suggestion: `CREATE INDEX idx_${index.table}_${index.column} ON ${index.table}(${index.column});`
      });
    });
    
    return issues;
  }

  /**
   * Find sequential scans in execution plan
   */
  private findSequentialScans(executionPlan: any): Array<{ table: string }> {
    const scans: Array<{ table: string }> = [];
    
    const traversePlan = (node: any) => {
      if (node['Node Type'] === 'Seq Scan') {
        scans.push({ table: node['Relation Name'] || 'unknown' });
      }
      
      if (node['Plans']) {
        node['Plans'].forEach(traversePlan);
      }
    };
    
    traversePlan(executionPlan[0]);
    return scans;
  }

  /**
   * Find missing indexes in execution plan
   */
  private findMissingIndexes(executionPlan: any): Array<{ table: string; column: string }> {
    const missingIndexes: Array<{ table: string; column: string }> = [];
    
    const traversePlan = (node: any) => {
      if (node['Node Type'] === 'Seq Scan' && node['Filter']) {
        // This is a simplified approach - in reality you'd need to parse the filter
        const table = node['Relation Name'];
        const filter = node['Filter'];
        
        // Extract column names from filter (simplified)
        const columnMatch = filter.match(/(\w+)\s*[=<>]/);
        if (columnMatch && table) {
          missingIndexes.push({
            table,
            column: columnMatch[1]
          });
        }
      }
      
      if (node['Plans']) {
        node['Plans'].forEach(traversePlan);
      }
    };
    
    traversePlan(executionPlan[0]);
    return missingIndexes;
  }

  /**
   * Generate basic suggestions based on issues and performance
   */
  private generateBasicSuggestions(issues: QueryIssue[], performance: PerformanceMetrics): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    // Add LIMIT for large result sets
    if (performance.rowsReturned > 1000) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'medium',
        title: 'Add LIMIT clause',
        description: 'Query returns many rows, consider adding LIMIT to improve performance',
        sql: '-- Add LIMIT 1000 or appropriate limit',
        impact: 'medium',
        effort: 'low'
      });
    }
    
    // Suggest adding WHERE clauses for full table scans
    const sequentialScans = issues.filter(i => i.type === 'sequential_scan');
    if (sequentialScans.length > 0) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'high',
        title: 'Add WHERE clause',
        description: 'Query performs full table scan, add WHERE clause to filter data',
        sql: '-- Add appropriate WHERE conditions',
        impact: 'high',
        effort: 'medium'
      });
    }
    
    // Suggest using specific columns instead of SELECT *
    if (performance.rowsReturned > 100) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'low',
        title: 'Select specific columns',
        description: 'Use specific column names instead of SELECT * for better performance',
        sql: '-- Replace SELECT * with specific columns',
        impact: 'low',
        effort: 'low'
      });
    }
    
    return suggestions;
  }
} 