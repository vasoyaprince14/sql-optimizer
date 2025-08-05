import { Client } from 'pg';

export interface QueryBuilderOptions {
  table: string;
  columns?: string[];
  where?: Record<string, any>;
  joins?: JoinClause[];
  orderBy?: OrderByClause[];
  groupBy?: string[];
  having?: string;
  limit?: number;
  offset?: number;
}

export interface JoinClause {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  table: string;
  on: string;
}

export interface OrderByClause {
  column: string;
  direction: 'ASC' | 'DESC';
}

export interface QueryBuilderResult {
  sql: string;
  explanation: string;
  optimizationTips: string[];
}

export class QueryBuilder {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Build an optimized SQL query from options
   */
  async buildQuery(options: QueryBuilderOptions): Promise<QueryBuilderResult> {
    const { table, columns, where, joins, orderBy, groupBy, having, limit, offset } = options;
    
    let sql = 'SELECT ';
    
    // Build SELECT clause
    if (columns && columns.length > 0) {
      sql += columns.join(', ');
    } else {
      sql += '*';
    }
    
    sql += ` FROM ${table}`;
    
    // Build JOIN clauses
    if (joins && joins.length > 0) {
      for (const join of joins) {
        sql += ` ${join.type} JOIN ${join.table} ON ${join.on}`;
      }
    }
    
    // Build WHERE clause
    if (where && Object.keys(where).length > 0) {
      const conditions = Object.entries(where).map(([key, value]) => {
        if (typeof value === 'string') {
          return `${key} = '${value}'`;
        } else if (Array.isArray(value)) {
          return `${key} IN (${value.map(v => typeof v === 'string' ? `'${v}'` : v).join(', ')})`;
        } else {
          return `${key} = ${value}`;
        }
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // Build GROUP BY clause
    if (groupBy && groupBy.length > 0) {
      sql += ` GROUP BY ${groupBy.join(', ')}`;
    }
    
    // Build HAVING clause
    if (having) {
      sql += ` HAVING ${having}`;
    }
    
    // Build ORDER BY clause
    if (orderBy && orderBy.length > 0) {
      const orderClauses = orderBy.map(order => `${order.column} ${order.direction}`);
      sql += ` ORDER BY ${orderClauses.join(', ')}`;
    }
    
    // Build LIMIT and OFFSET
    if (limit) {
      sql += ` LIMIT ${limit}`;
    }
    
    if (offset) {
      sql += ` OFFSET ${offset}`;
    }
    
    // Generate explanation and optimization tips
    const explanation = this.generateExplanation(options);
    const optimizationTips = await this.generateOptimizationTips(options);
    
    return {
      sql,
      explanation,
      optimizationTips
    };
  }

  /**
   * Generate suggested queries based on table analysis
   */
  async suggestQueries(tableName: string): Promise<string[]> {
    try {
      // Get table columns
      const columnsResult = await this.client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName]);
      
      const columns = columnsResult.rows;
      const suggestions: string[] = [];
      
      // Find common column patterns
      const idColumn = columns.find(col => col.column_name === 'id');
      const nameColumn = columns.find(col => col.column_name.includes('name'));
      const emailColumn = columns.find(col => col.column_name.includes('email'));
      const statusColumn = columns.find(col => col.column_name.includes('status'));
      const createdColumn = columns.find(col => col.column_name.includes('created'));
      
      // Basic queries
      suggestions.push(`SELECT * FROM ${tableName} LIMIT 10`);
      
      if (idColumn) {
        suggestions.push(`SELECT COUNT(*) FROM ${tableName}`);
      }
      
      if (nameColumn) {
        suggestions.push(`SELECT ${nameColumn.column_name} FROM ${tableName} ORDER BY ${nameColumn.column_name}`);
      }
      
      if (emailColumn) {
        suggestions.push(`SELECT DISTINCT ${emailColumn.column_name} FROM ${tableName}`);
      }
      
      if (statusColumn) {
        suggestions.push(`SELECT ${statusColumn.column_name}, COUNT(*) FROM ${tableName} GROUP BY ${statusColumn.column_name}`);
      }
      
      if (createdColumn) {
        suggestions.push(`SELECT * FROM ${tableName} ORDER BY ${createdColumn.column_name} DESC LIMIT 5`);
      }
      
      // Find foreign key relationships
      const fkResult = await this.client.query(`
        SELECT
          tc.column_name,
          ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = $1
      `, [tableName]);
      
      // Suggest JOIN queries
      fkResult.rows.forEach(fk => {
        suggestions.push(`SELECT * FROM ${tableName} t1 JOIN ${fk.foreign_table_name} t2 ON t1.${fk.column_name} = t2.id`);
      });
      
      return suggestions;
    } catch (error) {
      return [`SELECT * FROM ${tableName} LIMIT 10`];
    }
  }

  /**
   * Generate explanation for the query options
   */
  private generateExplanation(options: QueryBuilderOptions): string {
    let explanation = `This query retrieves data from the '${options.table}' table`;
    
    if (options.columns && options.columns.length > 0) {
      explanation += ` selecting specific columns: ${options.columns.join(', ')}`;
    } else {
      explanation += ' selecting all columns (*)';
    }
    
    if (options.joins && options.joins.length > 0) {
      explanation += ` with ${options.joins.length} JOIN(s)`;
    }
    
    if (options.where) {
      const conditionCount = Object.keys(options.where).length;
      explanation += ` filtered by ${conditionCount} condition(s)`;
    }
    
    if (options.groupBy && options.groupBy.length > 0) {
      explanation += ` grouped by ${options.groupBy.join(', ')}`;
    }
    
    if (options.orderBy && options.orderBy.length > 0) {
      explanation += ` ordered by ${options.orderBy.map(o => `${o.column} ${o.direction}`).join(', ')}`;
    }
    
    if (options.limit) {
      explanation += ` limited to ${options.limit} rows`;
    }
    
    return explanation + '.';
  }

  /**
   * Generate optimization tips for the query
   */
  private async generateOptimizationTips(options: QueryBuilderOptions): Promise<string[]> {
    const tips: string[] = [];
    
    // Check for SELECT *
    if (!options.columns || options.columns.length === 0) {
      tips.push('Consider specifying only the columns you need instead of SELECT *');
    }
    
    // Check for missing WHERE clause
    if (!options.where || Object.keys(options.where).length === 0) {
      tips.push('Add WHERE clauses to limit the data returned');
    }
    
    // Check for ORDER BY without LIMIT
    if (options.orderBy && options.orderBy.length > 0 && !options.limit) {
      tips.push('Consider adding LIMIT when using ORDER BY to avoid sorting large result sets');
    }
    
    // Check for potential index needs
    if (options.where) {
      Object.keys(options.where).forEach(column => {
        tips.push(`Consider creating an index on '${column}' if this query runs frequently`);
      });
    }
    
    // Check JOIN efficiency
    if (options.joins && options.joins.length > 3) {
      tips.push('Multiple JOINs detected - consider if all are necessary');
    }
    
    // Check GROUP BY efficiency
    if (options.groupBy && options.groupBy.length > 0) {
      tips.push('Ensure GROUP BY columns are indexed for better performance');
    }
    
    return tips;
  }

  /**
   * Get available tables for query building
   */
  async getAvailableTables(): Promise<string[]> {
    try {
      const result = await this.client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      return result.rows.map(row => row.table_name);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get available columns for a table
   */
  async getAvailableColumns(tableName: string): Promise<Array<{name: string, type: string}>> {
    try {
      const result = await this.client.query(`
        SELECT column_name as name, data_type as type
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName]);
      
      return result.rows;
    } catch (error) {
      return [];
    }
  }
}