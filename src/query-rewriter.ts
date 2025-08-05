import { AnalysisResult, Suggestion } from './types';

export class QueryRewriter {
  /**
   * Suggest query rewrites based on analysis results
   */
  async suggestRewrites(result: AnalysisResult): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    
    // Analyze the query for potential improvements
    const queryAnalysis = this.analyzeQuery(result.query);
    
    // Suggest specific rewrites based on analysis
    suggestions.push(...this.suggestSelectOptimizations(queryAnalysis));
    suggestions.push(...this.suggestWhereOptimizations(queryAnalysis));
    suggestions.push(...this.suggestJoinOptimizations(queryAnalysis));
    suggestions.push(...this.suggestOrderByOptimizations(queryAnalysis));
    suggestions.push(...this.suggestLimitOptimizations(result));
    
    return suggestions;
  }

  /**
   * Analyze query structure for optimization opportunities
   */
  private analyzeQuery(sql: string): {
    hasSelectStar: boolean;
    hasWhereClause: boolean;
    hasOrderBy: boolean;
    hasLimit: boolean;
    hasJoins: boolean;
    hasSubqueries: boolean;
    hasGroupBy: boolean;
    hasHaving: boolean;
    tableCount: number;
    estimatedRows: number;
  } {
    const normalizedSql = sql.toLowerCase();
    
    return {
      hasSelectStar: normalizedSql.includes('select *'),
      hasWhereClause: normalizedSql.includes('where'),
      hasOrderBy: normalizedSql.includes('order by'),
      hasLimit: normalizedSql.includes('limit'),
      hasJoins: normalizedSql.includes('join'),
      hasSubqueries: /\(.*select.*\)/i.test(sql),
      hasGroupBy: normalizedSql.includes('group by'),
      hasHaving: normalizedSql.includes('having'),
      tableCount: (normalizedSql.match(/from\s+\w+|join\s+\w+/g) || []).length,
      estimatedRows: this.estimateRowCount(sql)
    };
  }

  /**
   * Estimate row count based on query structure
   */
  private estimateRowCount(sql: string): number {
    // This is a very simplified estimation
    // In a real implementation, you'd need more sophisticated analysis
    const normalizedSql = sql.toLowerCase();
    
    if (normalizedSql.includes('limit')) {
      const limitMatch = normalizedSql.match(/limit\s+(\d+)/);
      if (limitMatch) {
        return parseInt(limitMatch[1]);
      }
    }
    
    // Default estimation based on query complexity
    if (normalizedSql.includes('where')) {
      return 1000; // Moderate filtering
    } else {
      return 10000; // No filtering, likely large result set
    }
  }

  /**
   * Suggest SELECT clause optimizations
   */
  private suggestSelectOptimizations(analysis: any): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    if (analysis.hasSelectStar) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'medium',
        title: 'Replace SELECT * with specific columns',
        description: 'Using SELECT * can impact performance and network transfer. Specify only needed columns.',
        sql: '-- Replace SELECT * with specific column names',
        impact: 'medium',
        effort: 'low'
      });
    }
    
    return suggestions;
  }

  /**
   * Suggest WHERE clause optimizations
   */
  private suggestWhereOptimizations(analysis: any): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    if (!analysis.hasWhereClause && analysis.tableCount > 0) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'high',
        title: 'Add WHERE clause to filter data',
        description: 'Query without WHERE clause may scan entire table. Add filtering conditions.',
        sql: '-- Add WHERE conditions to filter data',
        impact: 'high',
        effort: 'medium'
      });
    }
    
    return suggestions;
  }

  /**
   * Suggest JOIN optimizations
   */
  private suggestJoinOptimizations(analysis: any): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    if (analysis.hasJoins && analysis.tableCount > 2) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'medium',
        title: 'Optimize JOIN order',
        description: 'Consider the order of JOINs to minimize intermediate result sets.',
        sql: '-- Review and optimize JOIN order',
        impact: 'medium',
        effort: 'medium'
      });
    }
    
    return suggestions;
  }

  /**
   * Suggest ORDER BY optimizations
   */
  private suggestOrderByOptimizations(analysis: any): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    if (analysis.hasOrderBy && !analysis.hasLimit) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'medium',
        title: 'Add LIMIT with ORDER BY',
        description: 'ORDER BY without LIMIT may return large result sets. Consider adding LIMIT.',
        sql: '-- Add LIMIT clause after ORDER BY',
        impact: 'medium',
        effort: 'low'
      });
    }
    
    return suggestions;
  }

  /**
   * Suggest LIMIT optimizations
   */
  private suggestLimitOptimizations(result: AnalysisResult): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    if (result.performance.rowsReturned > 1000 && !result.query.toLowerCase().includes('limit')) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'medium',
        title: 'Add LIMIT clause',
        description: `Query returns ${result.performance.rowsReturned} rows. Consider adding LIMIT to improve performance.`,
        sql: '-- Add LIMIT 1000 or appropriate limit',
        impact: 'medium',
        effort: 'low'
      });
    }
    
    return suggestions;
  }

  /**
   * Generate specific query rewrite suggestions
   */
  async generateSpecificRewrites(result: AnalysisResult): Promise<string[]> {
    const rewrites: string[] = [];
    
    // Example rewrites based on common patterns
    const originalQuery = result.query.toLowerCase();
    
    // Replace SELECT * with specific columns
    if (originalQuery.includes('select *')) {
      rewrites.push('-- Replace SELECT * with specific columns: SELECT id, name, email FROM table');
    }
    
    // Add WHERE clause if missing
    if (!originalQuery.includes('where') && originalQuery.includes('from')) {
      rewrites.push('-- Add WHERE clause: WHERE condition = value');
    }
    
    // Add LIMIT if missing with ORDER BY
    if (originalQuery.includes('order by') && !originalQuery.includes('limit')) {
      rewrites.push('-- Add LIMIT: LIMIT 1000');
    }
    
    // Use EXISTS instead of IN for subqueries
    if (originalQuery.includes(' in (')) {
      rewrites.push('-- Consider using EXISTS instead of IN for better performance');
    }
    
    // Use specific columns in GROUP BY
    if (originalQuery.includes('group by')) {
      rewrites.push('-- Ensure GROUP BY columns match SELECT columns');
    }
    
    return rewrites;
  }

  /**
   * Check for common anti-patterns
   */
  async detectAntiPatterns(result: AnalysisResult): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    const query = result.query.toLowerCase();
    
    // SELECT * anti-pattern
    if (query.includes('select *')) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'medium',
        title: 'Avoid SELECT *',
        description: 'SELECT * retrieves all columns, which can impact performance and network transfer.',
        sql: '-- Replace with specific column names',
        impact: 'medium',
        effort: 'low'
      });
    }
    
    // LIKE with leading wildcard
    if (query.includes('like \'%') || query.includes('like "%')) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'high',
        title: 'Avoid leading wildcards in LIKE',
        description: 'LIKE \'%pattern\' cannot use indexes effectively. Consider full-text search or different approach.',
        sql: '-- Use LIKE \'pattern%\' or full-text search',
        impact: 'high',
        effort: 'medium'
      });
    }
    
    // Functions on indexed columns
    if (query.includes('where lower(') || query.includes('where upper(') || query.includes('where date(')) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'high',
        title: 'Avoid functions on indexed columns',
        description: 'Functions on indexed columns prevent index usage. Consider indexing the function result.',
        sql: '-- Create functional index or restructure query',
        impact: 'high',
        effort: 'medium'
      });
    }
    
    // OR conditions that could be UNION
    if (query.includes(' or ') && query.includes('where')) {
      suggestions.push({
        type: 'query_rewrite',
        priority: 'medium',
        title: 'Consider UNION for OR conditions',
        description: 'OR conditions can prevent index usage. Consider using UNION for better performance.',
        sql: '-- Replace OR with UNION of separate queries',
        impact: 'medium',
        effort: 'high'
      });
    }
    
    return suggestions;
  }
} 