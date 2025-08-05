import { Client } from 'pg';

/**
 * Format SQL query for better readability
 */
export function formatQuery(sql: string): string {
  // Simple SQL formatting - in a real implementation you'd use a proper SQL formatter
  return sql
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*=\s*/g, ' = ')
    .replace(/\s*\(\s*/g, ' (')
    .replace(/\s*\)\s*/g, ') ')
    .trim();
}

/**
 * Parse multiple SQL queries from a string
 */
export function parseSQLQueries(sqlString: string): string[] {
  // Remove comments and empty lines
  const cleanSQL = sqlString
    .split('\n')
    .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
    .join('\n');
  
  // Split by semicolon and filter out empty queries
  return cleanSQL
    .split(';')
    .map(query => query.trim().replace(/\s+/g, ' '))
    .filter(query => query.length > 0);
}

/**
 * Parse SQL query to extract basic information
 */
export function parseSQL(sql: string): {
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'ALTER' | 'DROP' | 'UNKNOWN';
  tables: string[];
  columns: string[];
  hasWhere: boolean;
  hasOrderBy: boolean;
  hasLimit: boolean;
  hasJoins: boolean;
} {
  const normalizedSql = sql.toLowerCase();
  
  // Determine query type
  let type: any = 'UNKNOWN';
  if (normalizedSql.startsWith('select')) type = 'SELECT';
  else if (normalizedSql.startsWith('insert')) type = 'INSERT';
  else if (normalizedSql.startsWith('update')) type = 'UPDATE';
  else if (normalizedSql.startsWith('delete')) type = 'DELETE';
  else if (normalizedSql.startsWith('create')) type = 'CREATE';
  else if (normalizedSql.startsWith('alter')) type = 'ALTER';
  else if (normalizedSql.startsWith('drop')) type = 'DROP';
  
  // Extract table names (simplified)
  const tableMatches = normalizedSql.match(/from\s+(\w+)|join\s+(\w+)|into\s+(\w+)|update\s+(\w+)/g);
  const tables = tableMatches ? 
    tableMatches.map(match => match.replace(/from\s+|join\s+|into\s+|update\s+/, '')) : [];
  
  // Extract column names (simplified)
  const columnMatches = normalizedSql.match(/(\w+)\.(\w+)/g);
  const columns = columnMatches ? 
    columnMatches.map(match => match.split('.')[1]) : [];
  
  return {
    type,
    tables,
    columns,
    hasWhere: normalizedSql.includes('where'),
    hasOrderBy: normalizedSql.includes('order by'),
    hasLimit: normalizedSql.includes('limit'),
    hasJoins: normalizedSql.includes('join')
  };
}

/**
 * Validate database connection
 */
export async function validateConnection(client: Client): Promise<boolean> {
  try {
    await client.query('SELECT 1');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generate a unique identifier
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Calculate execution time
 */
export function calculateExecutionTime(startTime: number): number {
  return Date.now() - startTime;
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format milliseconds to human readable format
 */
export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if a string is a valid SQL query
 */
export function isValidSQL(sql: string): boolean {
  const trimmed = sql.trim().toLowerCase();
  
  // Basic validation - check for common SQL keywords
  const sqlKeywords = ['select', 'insert', 'update', 'delete', 'create', 'alter', 'drop'];
  const hasKeyword = sqlKeywords.some(keyword => trimmed.startsWith(keyword));
  
  // Check for basic structure
  const hasFrom = trimmed.includes('from') || !trimmed.startsWith('select');
  const hasSemicolon = trimmed.endsWith(';');
  
  return hasKeyword && (hasFrom || hasSemicolon);
}

/**
 * Extract table names from SQL query
 */
export function extractTableNames(sql: string): string[] {
  const normalizedSql = sql.toLowerCase();
  const tableMatches = normalizedSql.match(/from\s+(\w+)|join\s+(\w+)|into\s+(\w+)|update\s+(\w+)/g);
  
  if (!tableMatches) return [];
  
  return tableMatches.map(match => 
    match.replace(/from\s+|join\s+|into\s+|update\s+/, '')
  );
}

/**
 * Extract column names from SQL query
 */
export function extractColumnNames(sql: string): string[] {
  const normalizedSql = sql.toLowerCase();
  const columnMatches = normalizedSql.match(/(\w+)\.(\w+)/g);
  
  if (!columnMatches) return [];
  
  return columnMatches.map(match => match.split('.')[1]);
}

/**
 * Check if query contains specific patterns
 */
export function hasPattern(sql: string, pattern: string): boolean {
  return sql.toLowerCase().includes(pattern.toLowerCase());
}

/**
 * Generate a summary of query complexity
 */
export function getQueryComplexity(sql: string): {
  score: number;
  factors: string[];
} {
  const factors: string[] = [];
  let score = 0;
  
  const normalizedSql = sql.toLowerCase();
  
  // Check for complex patterns
  if (normalizedSql.includes('join')) {
    factors.push('Has JOINs');
    score += 2;
  }
  
  if (normalizedSql.includes('subquery') || /\(.*select.*\)/i.test(sql)) {
    factors.push('Has subqueries');
    score += 3;
  }
  
  if (normalizedSql.includes('union')) {
    factors.push('Has UNION');
    score += 2;
  }
  
  if (normalizedSql.includes('group by')) {
    factors.push('Has GROUP BY');
    score += 1;
  }
  
  if (normalizedSql.includes('order by')) {
    factors.push('Has ORDER BY');
    score += 1;
  }
  
  if (normalizedSql.includes('having')) {
    factors.push('Has HAVING');
    score += 2;
  }
  
  if (normalizedSql.includes('distinct')) {
    factors.push('Has DISTINCT');
    score += 1;
  }
  
  if (normalizedSql.includes('select *')) {
    factors.push('Uses SELECT *');
    score += 1;
  }
  
  return { score, factors };
}

/**
 * Sanitize SQL for logging (remove sensitive data)
 */
export function sanitizeSQL(sql: string): string {
  return sql
    .replace(/password\s*=\s*['"][^'"]*['"]/gi, 'password=***')
    .replace(/api_key\s*=\s*['"][^'"]*['"]/gi, 'api_key=***')
    .replace(/token\s*=\s*['"][^'"]*['"]/gi, 'token=***')
    .replace(/secret\s*=\s*['"][^'"]*['"]/gi, 'secret=***');
} 