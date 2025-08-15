export interface SqlAnalyzerConfig {
  // Database connection settings
  database?: {
    type?: 'postgresql' | 'mysql' | 'mariadb' | 'sqlserver' | 'oracle' | 'sqlite';
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    ssl?: boolean;
    connectionString?: string;
    // Database-specific options
    postgresql?: {
      schema?: string;
      sslMode?: 'disable' | 'require' | 'verify-ca' | 'verify-full';
    };
    mysql?: {
      charset?: string;
      timezone?: string;
      ssl?: boolean;
    };
    sqlserver?: {
      encrypt?: boolean;
      trustServerCertificate?: boolean;
      serverName?: string;
    };
    oracle?: {
      serviceName?: string;
      sid?: string;
      tns?: string;
    };
  };

  // AI Integration settings
  ai?: {
    enabled?: boolean;
    provider?: 'openai' | 'anthropic' | 'local' | 'azure' | 'google';
    apiKey?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    endpoint?: string; // For Azure OpenAI
    organization?: string; // For OpenAI
  };

  // Analysis settings
  analysis?: {
    includeSchema?: boolean;
    includeTriggers?: boolean;
    includeProcedures?: boolean;
    includeRLS?: boolean;
    includeCostAnalysis?: boolean;
    includeAIInsights?: boolean;
    performanceThreshold?: number;
    securityLevel?: 'basic' | 'standard' | 'strict';
    // New analysis options
    includeIndexAnalysis?: boolean;
    includeQueryAnalysis?: boolean;
    includeBackupAnalysis?: boolean;
    includeMonitoringSetup?: boolean;
    includeMigrationGuide?: boolean;
    customQueries?: string[]; // Custom SQL queries to analyze
  };

  // Report settings
  reporting?: {
    format?: 'cli' | 'html' | 'json' | 'pdf' | 'md' | 'csv' | 'xml';
    outputPath?: string;
    includeCharts?: boolean;
    includeBeforeAfter?: boolean;
    includeImplementationGuide?: boolean;
    includeExecutiveSummary?: boolean;
    includeTechnicalDetails?: boolean;
    customBranding?: {
      companyName?: string;
      logo?: string;
      colors?: {
        primary?: string;
        secondary?: string;
      };
    };
    // New reporting options
    includeTrends?: boolean;
    includeBenchmarks?: boolean;
    includeROICalculation?: boolean;
    includeComplianceReport?: boolean;
  };

  // Advanced settings
  advanced?: {
    concurrentAnalysis?: boolean;
    cacheResults?: boolean;
    cacheTTL?: number;
    retryAttempts?: number;
    timeout?: number;
    verbose?: boolean;
    skipLargeObjects?: boolean;
    maxTableSize?: number;
    // New advanced options
    enableProfiling?: boolean;
    enableMetrics?: boolean;
    enableAlerting?: boolean;
    enableScheduling?: boolean;
    maxConcurrentConnections?: number;
    enableConnectionPooling?: boolean;
  };

  // New: Monitoring and Alerting
  monitoring?: {
    enabled?: boolean;
    metrics?: {
      collectPerformanceMetrics?: boolean;
      collectResourceUsage?: boolean;
      collectQueryMetrics?: boolean;
      collectErrorMetrics?: boolean;
    };
    alerting?: {
      enabled?: boolean;
      channels?: ('email' | 'slack' | 'webhook' | 'pagerduty')[];
      thresholds?: {
        criticalIssues?: number;
        performanceDegradation?: number;
        securityVulnerabilities?: number;
      };
    };
  };

  // New: Compliance and Governance
  compliance?: {
    enabled?: boolean;
    frameworks?: ('SOX' | 'GDPR' | 'HIPAA' | 'PCI-DSS' | 'SOC2')[];
    dataClassification?: boolean;
    accessControlAudit?: boolean;
    encryptionAudit?: boolean;
    backupCompliance?: boolean;
  };

  // New: Integration settings
  integrations?: {
    jira?: {
      enabled?: boolean;
      url?: string;
      username?: string;
      apiToken?: string;
      projectKey?: string;
    };
    slack?: {
      enabled?: boolean;
      webhookUrl?: string;
      channel?: string;
    };
    datadog?: {
      enabled?: boolean;
      apiKey?: string;
      appKey?: string;
    };
    prometheus?: {
      enabled?: boolean;
      endpoint?: string;
    };
  };
}

export const defaultConfig: SqlAnalyzerConfig = {
  database: {
    host: 'localhost',
    port: 5432,
    ssl: false
  },
  ai: {
    enabled: false,
    provider: 'openai',
    model: 'gpt-4',
    maxTokens: 2000,
    temperature: 0.1
  },
  analysis: {
    includeSchema: true,
    includeTriggers: true,
    includeProcedures: true,
    includeRLS: true,
    includeCostAnalysis: true,
    includeAIInsights: false,
    performanceThreshold: 1000,
    securityLevel: 'standard'
  },
  reporting: {
    format: 'html',
    outputPath: './reports',
    includeCharts: true,
    includeBeforeAfter: true,
    includeImplementationGuide: true
  },
  advanced: {
    concurrentAnalysis: true,
    cacheResults: false,
    cacheTTL: 300,
    retryAttempts: 3,
    timeout: 30000,
    verbose: false,
    skipLargeObjects: false,
    maxTableSize: 1000000000 // 1GB
  }
};

export class ConfigManager {
  private config: SqlAnalyzerConfig;

  constructor(userConfig?: Partial<SqlAnalyzerConfig>) {
    this.config = this.mergeConfig(defaultConfig, userConfig || {});
  }

  getConfig(): SqlAnalyzerConfig {
    return this.config;
  }

  updateConfig(updates: Partial<SqlAnalyzerConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
  }

  private mergeConfig(base: SqlAnalyzerConfig, override: Partial<SqlAnalyzerConfig>): SqlAnalyzerConfig {
    return {
      database: { ...base.database, ...override.database },
      ai: { ...base.ai, ...override.ai },
      analysis: { ...base.analysis, ...override.analysis },
      reporting: { ...base.reporting, ...override.reporting },
      advanced: { ...base.advanced, ...override.advanced }
    };
  }

  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate AI settings
    if (this.config.ai?.enabled && !this.config.ai?.apiKey) {
      errors.push('AI is enabled but no API key provided');
    }

    // Validate database settings
    if (!this.config.database?.connectionString && 
        (!this.config.database?.host || !this.config.database?.database)) {
      errors.push('Either connectionString or host+database must be provided');
    }

    // Validate output path
    if (this.config.reporting?.outputPath && 
        !this.isValidPath(this.config.reporting.outputPath)) {
      errors.push('Invalid output path specified');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private isValidPath(path: string): boolean {
    // Basic path validation
    return typeof path === 'string' && path.length > 0;
  }

  /**
   * Load configuration from environment variables
   */
  static fromEnvironment(): ConfigManager {
    const envConfig: Partial<SqlAnalyzerConfig> = {};

    // Database settings from env
    if (process.env.DATABASE_URL) {
      envConfig.database = { connectionString: process.env.DATABASE_URL };
    } else {
      envConfig.database = {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true'
      };
    }

    // AI settings from env
    if (process.env.OPENAI_API_KEY) {
      envConfig.ai = {
        enabled: true,
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4'
      };
    }

    // Analysis settings from env
    envConfig.analysis = {
      includeAIInsights: process.env.ENABLE_AI_INSIGHTS === 'true',
      securityLevel: (process.env.SECURITY_LEVEL as any) || 'standard'
    };

    // Reporting settings from env
    envConfig.reporting = {
      format: (process.env.REPORT_FORMAT as any) || 'html',
      outputPath: process.env.OUTPUT_PATH || './reports'
    };

    return new ConfigManager(envConfig);
  }

  /**
   * Load configuration from file
   */
  static async fromFile(filePath: string): Promise<ConfigManager> {
    try {
      const fs = await import('fs/promises');
      const configData = await fs.readFile(filePath, 'utf-8');
      const userConfig = JSON.parse(configData);
      return new ConfigManager(userConfig);
    } catch (error) {
      throw new Error(`Failed to load config from ${filePath}: ${error}`);
    }
  }

  /**
   * Save configuration to file
   */
  async saveToFile(filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      await fs.writeFile(filePath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save config to ${filePath}: ${error}`);
    }
  }
}

// Configuration presets for common scenarios
export const configPresets = {
  development: {
    advanced: {
      verbose: true,
      cacheResults: false
    },
    analysis: {
      securityLevel: 'basic' as const
    }
  },

  production: {
    advanced: {
      verbose: false,
      cacheResults: true,
      cacheTTL: 600
    },
    analysis: {
      securityLevel: 'strict' as const,
      includeAIInsights: true
    }
  },

  ci: {
    reporting: {
      format: 'json' as const
    },
    analysis: {
      includeAIInsights: false
    },
    advanced: {
      timeout: 60000
    }
  },

  comprehensive: {
    analysis: {
      includeSchema: true,
      includeTriggers: true,
      includeProcedures: true,
      includeRLS: true,
      includeCostAnalysis: true,
      includeAIInsights: true,
      securityLevel: 'strict' as const
    },
    ai: {
      enabled: true,
      maxTokens: 4000
    }
  }
};