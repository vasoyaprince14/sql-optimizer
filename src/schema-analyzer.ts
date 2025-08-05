import { Client } from 'pg';
import { SchemaAnalysis, TableInfo, ColumnInfo, IndexInfo, Relationship, SchemaRecommendation } from './types';

export class SchemaAnalyzer {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Analyze database schema
   */
  async analyze(): Promise<SchemaAnalysis> {
    try {
      const tables = await this.getTables();
      const relationships = await this.getRelationships();
      const recommendations = await this.generateRecommendations(tables, relationships);
      
      // Calculate scores
      const normalizationScore = this.calculateNormalizationScore(tables, relationships);
      const performanceScore = this.calculatePerformanceScore(tables);
      
      return {
        tables,
        relationships,
        recommendations,
        normalizationScore,
        performanceScore
      };
    } catch (error) {
      throw new Error(`Schema analysis failed: ${error}`);
    }
  }

  /**
   * Get all tables with their structure
   */
  private async getTables(): Promise<TableInfo[]> {
    const result = await this.client.query(`
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
        CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key,
        fk.referenced_table_name,
        fk.referenced_column_name
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
      LEFT JOIN (
        SELECT ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
      ) pk ON t.table_name = pk.table_name AND c.column_name = pk.column_name
      LEFT JOIN (
        SELECT 
          ku.table_name, 
          ku.column_name,
          ccu.table_name as referenced_table_name,
          ccu.column_name as referenced_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
      ) fk ON t.table_name = fk.table_name AND c.column_name = fk.column_name
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name, c.ordinal_position
    `);

    const tableMap = new Map<string, TableInfo>();
    
    result.rows.forEach(row => {
      const tableName = row.table_name;
      
      if (!tableMap.has(tableName)) {
        tableMap.set(tableName, {
          name: tableName,
          columns: [],
          indexes: [],
          rowCount: 0,
          size: '0 MB'
        });
      }
      
      const table = tableMap.get(tableName)!;
      
      if (row.column_name) {
        table.columns.push({
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
          defaultValue: row.column_default,
          isPrimaryKey: row.is_primary_key,
          isForeignKey: row.is_foreign_key,
          referencedTable: row.referenced_table_name,
          referencedColumn: row.referenced_column_name
        });
      }
    });

    // Get indexes for each table
    for (const table of tableMap.values()) {
      table.indexes = await this.getTableIndexes(table.name);
    }

    // Get row counts and sizes
    for (const table of tableMap.values()) {
      const stats = await this.getTableStats(table.name);
      table.rowCount = stats.rowCount;
      table.size = stats.size;
    }

    return Array.from(tableMap.values());
  }

  /**
   * Get indexes for a table
   */
  private async getTableIndexes(tableName: string): Promise<IndexInfo[]> {
    const result = await this.client.query(`
      SELECT 
        i.relname as index_name,
        array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as columns,
        am.amname as index_type,
        ix.indisunique as is_unique,
        CASE 
          WHEN pg_catalog.pg_get_expr(ix.indpred, ix.indrelid) IS NOT NULL THEN true 
          ELSE false 
        END as is_partial
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON ix.indexrelid = i.oid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      JOIN pg_am am ON i.relam = am.oid
      WHERE t.relname = $1
      GROUP BY i.relname, am.amname, ix.indisunique, ix.indpred, ix.indrelid
    `, [tableName]);

    return result.rows.map(row => ({
      name: row.index_name,
      columns: row.columns,
      type: this.mapIndexType(row.index_type),
      unique: row.is_unique,
      partial: row.is_partial
    }));
  }

  /**
   * Get table statistics
   */
  private async getTableStats(tableName: string): Promise<{ rowCount: number; size: string }> {
    try {
      const result = await this.client.query(`
        SELECT 
          n_tup_ins + n_tup_upd + n_tup_del as row_count,
          pg_size_pretty(pg_total_relation_size($1::regclass)) as size
        FROM pg_stat_user_tables 
        WHERE relname = $1
      `, [tableName]);

      if (result.rows.length > 0) {
        return {
          rowCount: parseInt(result.rows[0].row_count) || 0,
          size: result.rows[0].size || '0 MB'
        };
      }
    } catch (error) {
      console.warn(`Failed to get stats for table ${tableName}:`, error);
    }

    return { rowCount: 0, size: '0 MB' };
  }

  /**
   * Get relationships between tables
   */
  private async getRelationships(): Promise<Relationship[]> {
    const result = await this.client.query(`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE constraint_type = 'FOREIGN KEY'
    `);

    return result.rows.map(row => ({
      fromTable: row.table_name,
      fromColumn: row.column_name,
      toTable: row.foreign_table_name,
      toColumn: row.foreign_column_name,
      type: 'one_to_many' as const // Simplified - in reality you'd need more analysis
    }));
  }

  /**
   * Generate schema recommendations
   */
  private async generateRecommendations(tables: TableInfo[], relationships: Relationship[]): Promise<SchemaRecommendation[]> {
    const recommendations: SchemaRecommendation[] = [];
    
    // Check for missing indexes on foreign keys
    for (const rel of relationships) {
      const fromTable = tables.find(t => t.name === rel.fromTable);
      if (fromTable) {
        const hasIndex = fromTable.indexes.some(idx => 
          idx.columns.includes(rel.fromColumn)
        );
        
        if (!hasIndex) {
          recommendations.push({
            type: 'index',
            priority: 'high',
            title: `Missing index on foreign key ${rel.fromTable}.${rel.fromColumn}`,
            description: `Foreign key columns should be indexed for better JOIN performance`,
            sql: `CREATE INDEX idx_${rel.fromTable}_${rel.fromColumn} ON ${rel.fromTable}(${rel.fromColumn});`,
            impact: 'high'
          });
        }
      }
    }
    
    // Check for tables without primary keys
    for (const table of tables) {
      const hasPrimaryKey = table.columns.some(col => col.isPrimaryKey);
      if (!hasPrimaryKey) {
        recommendations.push({
          type: 'constraint',
          priority: 'high',
          title: `Missing primary key on table ${table.name}`,
          description: `Every table should have a primary key for data integrity`,
          sql: `ALTER TABLE ${table.name} ADD PRIMARY KEY (id);`,
          impact: 'high'
        });
      }
    }
    
    // Check for large tables without indexes
    for (const table of tables) {
      if ((table.rowCount || 0) > 1000 && table.indexes.length === 0) {
        recommendations.push({
          type: 'index',
          priority: 'medium',
          title: `Large table ${table.name} has no indexes`,
          description: `Consider adding indexes for frequently queried columns`,
          sql: `-- Add indexes based on query patterns`,
          impact: 'medium'
        });
      }
    }
    
    // Check for data type optimizations
    for (const table of tables) {
      for (const column of table.columns) {
        if (column.type === 'character varying' && !column.nullable) {
          recommendations.push({
            type: 'data_type',
            priority: 'low',
            title: `Consider using CHAR instead of VARCHAR for ${table.name}.${column.name}`,
            description: `Fixed-length strings can be more efficient for non-nullable columns`,
            sql: `ALTER TABLE ${table.name} ALTER COLUMN ${column.name} TYPE CHAR(255);`,
            impact: 'low'
          });
        }
      }
    }
    
    return recommendations;
  }

  /**
   * Calculate normalization score
   */
  private calculateNormalizationScore(tables: TableInfo[], relationships: Relationship[]): number {
    let score = 10;
    
    // Deduct points for denormalization indicators
    for (const table of tables) {
      // Check for wide tables (many columns)
      if (table.columns.length > 20) {
        score -= 1;
      }
      
      // Check for tables with many nullable columns
      const nullableColumns = table.columns.filter(col => col.nullable).length;
      if (nullableColumns > table.columns.length * 0.5) {
        score -= 1;
      }
    }
    
    // Check for proper foreign key relationships
    const tablesWithFKs = new Set(relationships.map(r => r.fromTable));
    const tablesWithoutFKs = tables.filter(t => !tablesWithFKs.has(t.name)).length;
    if (tablesWithoutFKs > tables.length * 0.3) {
      score -= 1;
    }
    
    return Math.max(0, score);
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(tables: TableInfo[]): number {
    let score = 10;
    
    for (const table of tables) {
      // Deduct points for large tables without indexes
      if ((table.rowCount || 0) > 10000 && table.indexes.length === 0) {
        score -= 2;
      }
      
      // Deduct points for tables with too many indexes
      if (table.indexes.length > 10) {
        score -= 1;
      }
      
      // Deduct points for tables without primary keys
      const hasPrimaryKey = table.columns.some(col => col.isPrimaryKey);
      if (!hasPrimaryKey) {
        score -= 2;
      }
    }
    
    return Math.max(0, score);
  }

  /**
   * Map PostgreSQL index type to our enum
   */
  private mapIndexType(pgType: string): 'btree' | 'hash' | 'gin' | 'gist' | 'spgist' | 'brin' {
    switch (pgType) {
      case 'btree': return 'btree';
      case 'hash': return 'hash';
      case 'gin': return 'gin';
      case 'gist': return 'gist';
      case 'spgist': return 'spgist';
      case 'brin': return 'brin';
      default: return 'btree';
    }
  }
} 