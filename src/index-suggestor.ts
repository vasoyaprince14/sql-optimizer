import { Client } from 'pg';
import { AnalysisResult, Suggestion } from './types';

export class IndexSuggestor {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Suggest indexes based on query analysis
   */
  async suggestIndexes(result: AnalysisResult): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    
    // Extract table and column information from the query
    const queryInfo = this.extractQueryInfo(result.query);
    
    // Generate suggestions based on WHERE clauses
    const whereSuggestions = this.suggestIndexesForWhereClauses(queryInfo);
    suggestions.push(...whereSuggestions);
    
    // Generate suggestions based on JOIN conditions
    const joinSuggestions = this.suggestIndexesForJoins(queryInfo);
    suggestions.push(...joinSuggestions);
    
    // Generate suggestions based on ORDER BY
    const orderBySuggestions = this.suggestIndexesForOrderBy(queryInfo);
    suggestions.push(...orderBySuggestions);
    
    // Generate suggestions based on GROUP BY
    const groupBySuggestions = this.suggestIndexesForGroupBy(queryInfo);
    suggestions.push(...groupBySuggestions);
    
    // Check for existing indexes to avoid duplicates
    const existingIndexes = await this.getExistingIndexes(queryInfo.tables);
    const filteredSuggestions = this.filterExistingIndexes(suggestions, existingIndexes);
    
    return filteredSuggestions;
  }

  /**
   * Extract table and column information from SQL query
   */
  private extractQueryInfo(sql: string): {
    tables: string[];
    whereColumns: Array<{ table: string; column: string; operator: string }>;
    joinColumns: Array<{ table: string; column: string; referencedTable: string; referencedColumn: string }>;
    orderByColumns: Array<{ table: string; column: string; direction: string }>;
    groupByColumns: Array<{ table: string; column: string }>;
  } {
    const normalizedSql = sql.toLowerCase();
    
    // Extract table names (simplified)
    const tableMatches = normalizedSql.match(/from\s+(\w+)|join\s+(\w+)/g);
    const tables = tableMatches ? 
      tableMatches.map(match => match.replace(/from\s+|join\s+/, '')) : [];
    
    // Extract WHERE conditions (simplified)
    const whereMatches = normalizedSql.match(/(\w+)\.(\w+)\s*([=<>!]+)\s*[^,\s]+/g);
    const whereColumns = whereMatches ? 
      whereMatches.map(match => {
        const parts = match.match(/(\w+)\.(\w+)\s*([=<>!]+)/);
        return parts ? {
          table: parts[1],
          column: parts[2],
          operator: parts[3]
        } : null;
      }).filter((item): item is { table: string; column: string; operator: string } => item !== null) : [];
    
    // Extract JOIN conditions (simplified)
    const joinMatches = normalizedSql.match(/(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/g);
    const joinColumns = joinMatches ? 
      joinMatches.map(match => {
        const parts = match.match(/(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/);
        return parts ? {
          table: parts[1],
          column: parts[2],
          referencedTable: parts[3],
          referencedColumn: parts[4]
        } : null;
      }).filter((item): item is { table: string; column: string; referencedTable: string; referencedColumn: string } => item !== null) : [];
    
    // Extract ORDER BY columns (simplified)
    const orderByMatches = normalizedSql.match(/order\s+by\s+(\w+)\.(\w+)(?:\s+(asc|desc))?/g);
    const orderByColumns = orderByMatches ? 
      orderByMatches.map(match => {
        const parts = match.match(/order\s+by\s+(\w+)\.(\w+)(?:\s+(asc|desc))?/);
        return parts ? {
          table: parts[1],
          column: parts[2],
          direction: parts[3] || 'asc'
        } : null;
      }).filter((item): item is { table: string; column: string; direction: string } => item !== null) : [];
    
    // Extract GROUP BY columns (simplified)
    const groupByMatches = normalizedSql.match(/group\s+by\s+(\w+)\.(\w+)/g);
    const groupByColumns = groupByMatches ? 
      groupByMatches.map(match => {
        const parts = match.match(/group\s+by\s+(\w+)\.(\w+)/);
        return parts ? {
          table: parts[1],
          column: parts[2]
        } : null;
      }).filter((item): item is { table: string; column: string } => item !== null) : [];
    
    return {
      tables,
      whereColumns,
      joinColumns,
      orderByColumns,
      groupByColumns
    };
  }

  /**
   * Suggest indexes for WHERE clause columns
   */
  private suggestIndexesForWhereClauses(queryInfo: any): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    for (const whereCol of queryInfo.whereColumns) {
      suggestions.push({
        type: 'index',
        priority: 'high',
        title: `Index for WHERE clause on ${whereCol.table}.${whereCol.column}`,
        description: `Create index for filtering on ${whereCol.table}.${whereCol.column}`,
        sql: `CREATE INDEX idx_${whereCol.table}_${whereCol.column} ON ${whereCol.table}(${whereCol.column});`,
        impact: 'high',
        effort: 'low'
      });
    }
    
    return suggestions;
  }

  /**
   * Suggest indexes for JOIN conditions
   */
  private suggestIndexesForJoins(queryInfo: any): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    for (const joinCol of queryInfo.joinColumns) {
      suggestions.push({
        type: 'index',
        priority: 'high',
        title: `Index for JOIN on ${joinCol.table}.${joinCol.column}`,
        description: `Create index for join condition on ${joinCol.table}.${joinCol.column}`,
        sql: `CREATE INDEX idx_${joinCol.table}_${joinCol.column} ON ${joinCol.table}(${joinCol.column});`,
        impact: 'high',
        effort: 'low'
      });
    }
    
    return suggestions;
  }

  /**
   * Suggest indexes for ORDER BY columns
   */
  private suggestIndexesForOrderBy(queryInfo: any): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    for (const orderCol of queryInfo.orderByColumns) {
      suggestions.push({
        type: 'index',
        priority: 'medium',
        title: `Index for ORDER BY on ${orderCol.table}.${orderCol.column}`,
        description: `Create index for sorting on ${orderCol.table}.${orderCol.column}`,
        sql: `CREATE INDEX idx_${orderCol.table}_${orderCol.column} ON ${orderCol.table}(${orderCol.column});`,
        impact: 'medium',
        effort: 'low'
      });
    }
    
    return suggestions;
  }

  /**
   * Suggest indexes for GROUP BY columns
   */
  private suggestIndexesForGroupBy(queryInfo: any): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    for (const groupCol of queryInfo.groupByColumns) {
      suggestions.push({
        type: 'index',
        priority: 'medium',
        title: `Index for GROUP BY on ${groupCol.table}.${groupCol.column}`,
        description: `Create index for grouping on ${groupCol.table}.${groupCol.column}`,
        sql: `CREATE INDEX idx_${groupCol.table}_${groupCol.column} ON ${groupCol.table}(${groupCol.column});`,
        impact: 'medium',
        effort: 'low'
      });
    }
    
    return suggestions;
  }

  /**
   * Get existing indexes for tables
   */
  private async getExistingIndexes(tables: string[]): Promise<Array<{ table: string; column: string }>> {
    const existingIndexes: Array<{ table: string; column: string }> = [];
    
    try {
      for (const table of tables) {
        const result = await this.client.query(`
          SELECT 
            i.relname as index_name,
            a.attname as column_name
          FROM pg_class t
          JOIN pg_index ix ON t.oid = ix.indrelid
          JOIN pg_class i ON ix.indexrelid = i.oid
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
          WHERE t.relname = $1
        `, [table]);
        
        result.rows.forEach(row => {
          existingIndexes.push({
            table,
            column: row.column_name
          });
        });
      }
    } catch (error) {
      console.warn('Failed to get existing indexes:', error);
    }
    
    return existingIndexes;
  }

  /**
   * Filter out suggestions for indexes that already exist
   */
  private filterExistingIndexes(suggestions: Suggestion[], existingIndexes: Array<{ table: string; column: string }>): Suggestion[] {
    return suggestions.filter(suggestion => {
      if (suggestion.sql) {
        const match = suggestion.sql.match(/CREATE INDEX.*ON\s+(\w+)\((\w+)\)/);
        if (match) {
          const table = match[1];
          const column = match[2];
          
          return !existingIndexes.some(existing => 
            existing.table === table && existing.column === column
          );
        }
      }
      return true;
    });
  }

  /**
   * Suggest composite indexes for multiple conditions
   */
  async suggestCompositeIndexes(result: AnalysisResult): Promise<Suggestion[]> {
    const queryInfo = this.extractQueryInfo(result.query);
    const suggestions: Suggestion[] = [];
    
    // Group WHERE conditions by table
    const whereByTable: { [table: string]: string[] } = {};
    queryInfo.whereColumns.forEach(col => {
      if (!whereByTable[col.table]) {
        whereByTable[col.table] = [];
      }
      whereByTable[col.table].push(col.column);
    });
    
    // Suggest composite indexes for tables with multiple WHERE conditions
    for (const [table, columns] of Object.entries(whereByTable)) {
      if (columns.length > 1) {
        const columnList = columns.join(', ');
        suggestions.push({
          type: 'index',
          priority: 'high',
          title: `Composite index for ${table} on ${columnList}`,
          description: `Create composite index for multiple WHERE conditions on ${table}`,
          sql: `CREATE INDEX idx_${table}_${columns.join('_')} ON ${table}(${columnList});`,
          impact: 'high',
          effort: 'low'
        });
      }
    }
    
    return suggestions;
  }
} 