import { Client } from 'pg';
import { SqlAnalyzerConfig } from './config';

export interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query(sql: string, params?: any[]): Promise<any>;
  getDatabaseInfo(): Promise<DatabaseInfo>;
  getTableList(): Promise<TableInfo[]>;
  getIndexInfo(): Promise<IndexInfo[]>;
  getPerformanceMetrics(): Promise<PerformanceMetrics>;
  getSecurityInfo(): Promise<SecurityInfo>;
  getBackupInfo(): Promise<BackupInfo>;
  getMonitoringQueries(): Promise<MonitoringQuery[]>;
}

export interface DatabaseInfo {
  type: string;
  version: string;
  size: string;
  uptime: string;
  connections: number;
  maxConnections: number;
}

export interface TableInfo {
  name: string;
  schema: string;
  size: string;
  rowCount: number;
  hasPrimaryKey: boolean;
  hasIndexes: boolean;
  lastAnalyzed?: string;
}

export interface IndexInfo {
  name: string;
  table: string;
  columns: string[];
  type: string;
  size: string;
  usage: number;
  isUnique: boolean;
}

export interface PerformanceMetrics {
  slowQueries: number;
  avgQueryTime: number;
  cacheHitRatio: number;
  connectionUtilization: number;
  diskUsage: number;
}

export interface SecurityInfo {
  users: UserInfo[];
  roles: RoleInfo[];
  permissions: PermissionInfo[];
  encryptionEnabled: boolean;
  sslEnabled: boolean;
}

export interface UserInfo {
  name: string;
  canLogin: boolean;
  superuser: boolean;
  created: string;
}

export interface RoleInfo {
  name: string;
  canLogin: boolean;
  superuser: boolean;
  attributes: string[];
}

export interface PermissionInfo {
  grantee: string;
  table: string;
  privilege: string;
  grantable: boolean;
}

export interface BackupInfo {
  lastBackup?: string;
  backupType?: string;
  backupSize?: string;
  retentionPolicy?: string;
  recoveryPointObjective?: string;
}

export interface MonitoringQuery {
  name: string;
  sql: string;
  description: string;
  frequency: string;
  threshold?: number;
}

// PostgreSQL Adapter
export class PostgreSQLAdapter implements DatabaseAdapter {
  private client: Client;
  private config: SqlAnalyzerConfig;

  constructor(config: SqlAnalyzerConfig) {
    this.config = config;
    this.client = new Client(this.getConnectionConfig());
  }

  private getConnectionConfig() {
    const db = this.config.database!;
    if (db.connectionString) {
      return { connectionString: db.connectionString };
    }
    
    return {
      host: db.host || 'localhost',
      port: db.port || 5432,
      database: db.database,
      user: db.user,
      password: db.password,
      ssl: db.postgresql?.sslMode === 'require' || db.ssl
    };
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.end();
  }

  async query(sql: string, params?: any[]): Promise<any> {
    const result = await this.client.query(sql, params);
    return result.rows;
  }

  async getDatabaseInfo(): Promise<DatabaseInfo> {
    const [version, size, uptime, connections] = await Promise.all([
      this.query('SELECT version() as v'),
      this.query("SELECT pg_size_pretty(pg_database_size(current_database())) as size"),
      this.query("SELECT date_trunc('second', now() - pg_postmaster_start_time()) as uptime"),
      this.query("SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'")
    ]);

    return {
      type: 'PostgreSQL',
      version: version[0]?.v || 'Unknown',
      size: size[0]?.size || 'Unknown',
      uptime: uptime[0]?.uptime || 'Unknown',
      connections: connections[0]?.count || 0,
      maxConnections: 100
    };
  }

  async getTableList(): Promise<TableInfo[]> {
    const tables = await this.query(`
      SELECT 
        t.table_name,
        t.table_schema,
        pg_size_pretty(pg_total_relation_size(quote_ident(t.table_schema)||'.'||quote_ident(t.table_name))) as size,
        (SELECT reltuples FROM pg_class WHERE relname = t.table_name) as row_count,
        EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE table_name = t.table_name AND constraint_type = 'PRIMARY KEY') as has_pk,
        EXISTS(SELECT 1 FROM pg_indexes WHERE tablename = t.table_name) as has_indexes,
        (SELECT last_analyze FROM pg_stat_user_tables WHERE relname = t.table_name) as last_analyzed
      FROM information_schema.tables t
      WHERE t.table_schema = 'public'
      ORDER BY t.table_name
    `);

    return tables.map((t: any) => ({
      name: t.table_name,
      schema: t.table_schema,
      size: t.size,
      rowCount: parseInt(t.row_count) || 0,
      hasPrimaryKey: t.has_pk,
      hasIndexes: t.has_indexes,
      lastAnalyzed: t.last_analyzed
    }));
  }

  async getIndexInfo(): Promise<IndexInfo[]> {
    const indexes = await this.query(`
      SELECT 
        i.indexname,
        t.tablename,
        array_to_string(array_agg(a.attname), ',') as columns,
        i.indexdef,
        pg_size_pretty(pg_relation_size(i.indexname::regclass)) as size,
        COALESCE(ix.idx_scan, 0) as usage,
        i.indisunique as is_unique
      FROM pg_indexes i
      JOIN pg_tables t ON i.tablename = t.tablename
      JOIN pg_class c ON i.indexname = c.relname
      JOIN pg_attribute a ON a.attrelid = c.relid AND a.attnum = ANY(c.relindkey)
      LEFT JOIN pg_stat_user_indexes ix ON ix.indexrelname = i.indexname
      WHERE i.schemaname = 'public'
      GROUP BY i.indexname, t.tablename, i.indexdef, i.indisunique, ix.idx_scan
      ORDER BY t.tablename, i.indexname
    `);

    return indexes.map((ix: any) => ({
      name: ix.indexname,
      table: ix.tablename,
      columns: ix.columns.split(','),
      type: ix.indexdef.includes('UNIQUE') ? 'UNIQUE' : 'BTREE',
      size: ix.size,
      usage: parseInt(ix.usage) || 0,
      isUnique: ix.is_unique
    }));
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const [slowQueries, avgTime, cacheHit, connections, diskUsage] = await Promise.all([
      this.query("SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND query_start < now() - interval '1 minute'"),
      this.query("SELECT avg(total_time) FROM pg_stat_statements"),
      this.query("SELECT sum(heap_blks_hit) * 100.0 / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio FROM pg_statio_user_tables"),
      this.query("SELECT count(*) FROM pg_stat_activity WHERE state = 'active'"),
      this.query("SELECT pg_size_pretty(sum(pg_total_relation_size(relid))) FROM pg_statio_user_tables")
    ]);

    return {
      slowQueries: slowQueries[0]?.count || 0,
      avgQueryTime: avgTime[0]?.avg || 0,
      cacheHitRatio: cacheHit[0]?.ratio || 0,
      connectionUtilization: connections[0]?.count || 0,
      diskUsage: diskUsage[0]?.pg_size_pretty || 'Unknown'
    };
  }

  async getSecurityInfo(): Promise<SecurityInfo> {
    const [users, roles, permissions, encryption, ssl] = await Promise.all([
      this.query("SELECT usename, usesuper, usecreatedb, usebypassrls FROM pg_user"),
      this.query("SELECT rolname, rolsuper, rolinherit, rolcreaterole FROM pg_roles"),
      this.query(`
        SELECT grantee, table_name, privilege_type, is_grantable 
        FROM information_schema.role_table_grants 
        WHERE table_schema = 'public'
      `),
      this.query("SHOW ssl"),
      this.query("SHOW ssl_ciphers")
    ]);

    return {
      users: users.map((u: any) => ({
        name: u.usename,
        canLogin: true,
        superuser: u.usesuper,
        created: 'Unknown'
      })),
      roles: roles.map((r: any) => ({
        name: r.rolname,
        canLogin: true,
        superuser: r.rolsuper,
        attributes: []
      })),
      permissions: permissions.map((p: any) => ({
        grantee: p.grantee,
        table: p.table_name,
        privilege: p.privilege_type,
        grantable: p.is_grantable === 'YES'
      })),
      encryptionEnabled: encryption[0]?.ssl === 'on',
      sslEnabled: ssl[0]?.ssl_ciphers !== ''
    };
  }

  async getBackupInfo(): Promise<BackupInfo> {
    const backupTools = await this.query(`
      SELECT name, setting FROM pg_settings 
      WHERE name IN ('archive_mode', 'wal_level', 'max_wal_senders')
    `);

    return {
      lastBackup: 'Unknown',
      backupType: backupTools.find((b: any) => b.name === 'archive_mode')?.setting === 'on' ? 'WAL Archiving' : 'Manual',
      retentionPolicy: 'Unknown',
      recoveryPointObjective: 'Unknown'
    };
  }

  async getMonitoringQueries(): Promise<MonitoringQuery[]> {
    return [
      {
        name: 'Slow Queries',
        sql: "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10",
        description: 'Top 10 slowest queries',
        frequency: '5 minutes'
      },
      {
        name: 'Connection Count',
        sql: "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'",
        description: 'Current active connections',
        frequency: '1 minute',
        threshold: 80
      },
      {
        name: 'Cache Hit Ratio',
        sql: "SELECT sum(heap_blks_hit) * 100.0 / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio FROM pg_statio_user_tables",
        description: 'Buffer cache hit ratio',
        frequency: '5 minutes',
        threshold: 90
      }
    ];
  }
}

// Factory function to create appropriate adapter
export function createDatabaseAdapter(config: SqlAnalyzerConfig): DatabaseAdapter {
  const dbType = config.database?.type || 'postgresql';
  
  switch (dbType) {
    case 'postgresql':
      return new PostgreSQLAdapter(config);
    default:
      return new PostgreSQLAdapter(config); // Default fallback
  }
}
