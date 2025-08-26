/**
 * Batch Analyzer - Analyze multiple databases at once
 * Provides efficient batch processing with parallel execution
 * 
 * @author Prince Vasoya
 * @version 1.5.2
 */

import { EventEmitter } from 'events';
import { EnhancedSQLAnalyzer } from './enhanced-sql-analyzer';
import { QuickHealthChecker } from './quick-health-checker';
import { SmartCache } from './smart-cache';

export interface BatchAnalysisConfig {
  maxConcurrency?: number;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  cacheResults?: boolean;
  quickMode?: boolean;
}

export interface DatabaseConnection {
  id: string;
  name: string;
  connectionString: string;
  type?: 'postgresql' | 'mysql' | 'mssql' | 'oracle';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface BatchAnalysisResult {
  totalDatabases: number;
  successful: number;
  failed: number;
  skipped: number;
  results: DatabaseAnalysisResult[];
  summary: BatchSummary;
  executionTime: number;
  timestamp: Date;
}

export interface DatabaseAnalysisResult {
  database: DatabaseConnection;
  status: 'success' | 'failed' | 'skipped' | 'timeout';
  result?: any;
  error?: string;
  executionTime: number;
  retryCount: number;
}

export interface BatchSummary {
  overallHealthScore: number;
  totalIssues: number;
  criticalIssues: number;
  securityRisks: number;
  performanceIssues: number;
  topRecommendations: string[];
  databasesByHealth: {
    excellent: number; // 9-10
    good: number;      // 7-8
    fair: number;      // 5-6
    poor: number;      // 3-4
    critical: number;  // 0-2
  };
}

export class BatchAnalyzer extends EventEmitter {
  private config: Required<BatchAnalysisConfig>;
  private cache: SmartCache;

  constructor(config: BatchAnalysisConfig = {}) {
    super();
    this.config = {
      maxConcurrency: 5,
      timeout: 300000, // 5 minutes
      retryAttempts: 2,
      retryDelay: 1000,
      cacheResults: true,
      quickMode: false,
      ...config
    };
    this.cache = new SmartCache({
      ttl: 1800000, // 30 minutes
      maxSize: 100, // 100MB
      compression: true
    });
  }

  /**
   * Analyze multiple databases
   */
  async analyzeDatabases(databases: DatabaseConnection[]): Promise<BatchAnalysisResult> {
    const startTime = Date.now();
    this.emit('start', databases.length);

    const results: DatabaseAnalysisResult[] = [];
    const semaphore = new Semaphore(this.config.maxConcurrency);

    // Process databases in parallel with concurrency limit
    const promises = databases.map(db => 
      semaphore.acquire().then(async (release) => {
        try {
          const result = await this.analyzeDatabase(db);
          results.push(result);
          this.emit('database:complete', db.id, result);
          return result;
        } finally {
          release();
        }
      })
    );

    await Promise.allSettled(promises);

    const executionTime = Date.now() - startTime;
    const summary = this.generateSummary(results);

    const batchResult: BatchAnalysisResult = {
      totalDatabases: databases.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      results,
      summary,
      executionTime,
      timestamp: new Date()
    };

    this.emit('complete', batchResult);
    return batchResult;
  }

  /**
   * Analyze a single database
   */
  private async analyzeDatabase(db: DatabaseConnection): Promise<DatabaseAnalysisResult> {
    const startTime = Date.now();
    let retryCount = 0;

    while (retryCount <= this.config.retryAttempts) {
      try {
        this.emit('database:start', db.id);

        // Check cache first
        if (this.config.cacheResults) {
          const cacheKey = `batch_${db.id}_${this.getCacheHash(db)}`;
          const cached = await this.cache.get(cacheKey);
          if (cached) {
            this.emit('database:cache_hit', db.id);
            return {
              database: db,
              status: 'success',
              result: cached,
              executionTime: Date.now() - startTime,
              retryCount
            };
          }
        }

        // Perform analysis
        const result = this.config.quickMode 
          ? await this.performQuickAnalysis(db)
          : await this.performFullAnalysis(db);

        // Cache result
        if (this.config.cacheResults) {
          const cacheKey = `batch_${db.id}_${this.getCacheHash(db)}`;
          await this.cache.set(cacheKey, result, 1800000); // 30 minutes
        }

        return {
          database: db,
          status: 'success',
          result,
          executionTime: Date.now() - startTime,
          retryCount
        };

      } catch (error) {
        retryCount++;
        
        if (retryCount > this.config.retryAttempts) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.emit('database:failed', db.id, errorMessage);
          return {
            database: db,
            status: 'failed',
            error: errorMessage,
            executionTime: Date.now() - startTime,
            retryCount
          };
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        this.emit('database:retry', db.id, retryCount, errorMessage);
        await this.delay(this.config.retryDelay * retryCount);
      }
    }

    return {
      database: db,
      status: 'failed',
      error: 'Max retries exceeded',
      executionTime: Date.now() - startTime,
      retryCount
    };
  }

  /**
   * Perform quick analysis
   */
  private async performQuickAnalysis(db: DatabaseConnection) {
    const checker = new QuickHealthChecker(db.connectionString, {
      timeout: 10000,
      includeSecurity: true,
      includePerformance: true,
      includeMaintenance: true
    });

    return await checker.checkHealth();
  }

  /**
   * Perform full analysis
   */
  private async performFullAnalysis(db: DatabaseConnection) {
    const analyzer = new EnhancedSQLAnalyzer(db.connectionString, {
      preset: 'production',
      format: 'json'
    });

    return await analyzer.analyze();
  }

  /**
   * Generate batch summary
   */
  private generateSummary(results: DatabaseAnalysisResult[]): BatchSummary {
    const successful = results.filter(r => r.status === 'success');
    const healthScores = successful
      .map(r => r.result?.overallScore || r.result?.summary?.overallScore || 0)
      .filter(score => score > 0);

    const overallHealthScore = healthScores.length > 0 
      ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
      : 0;

    const totalIssues = successful.reduce((sum, r) => {
      return sum + (r.result?.totalIssues || r.result?.summary?.totalIssues || 0);
    }, 0);

    const criticalIssues = successful.reduce((sum, r) => {
      return sum + (r.result?.criticalIssues || r.result?.summary?.criticalIssues || 0);
    }, 0);

    const securityRisks = successful.reduce((sum, r) => {
      const risk = r.result?.securityRisk || r.result?.summary?.securityRisk;
      return sum + (risk === 'high' || risk === 'critical' ? 1 : 0);
    }, 0);

    const performanceIssues = successful.reduce((sum, r) => {
      const risk = r.result?.performanceRisk || r.result?.summary?.performanceRisk;
      return sum + (risk === 'high' || risk === 'critical' ? 1 : 0);
    }, 0);

    // Categorize databases by health
    const databasesByHealth = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      critical: 0
    };

    healthScores.forEach(score => {
      if (score >= 9) databasesByHealth.excellent++;
      else if (score >= 7) databasesByHealth.good++;
      else if (score >= 5) databasesByHealth.fair++;
      else if (score >= 3) databasesByHealth.poor++;
      else databasesByHealth.critical++;
    });

    // Collect top recommendations
    const allRecommendations = successful
      .flatMap(r => r.result?.topRecommendations || r.result?.summary?.topRecommendations || [])
      .filter(rec => rec && rec.length > 0);

    const recommendationCounts = new Map<string, number>();
    allRecommendations.forEach(rec => {
      recommendationCounts.set(rec, (recommendationCounts.get(rec) || 0) + 1);
    });

    const topRecommendations = Array.from(recommendationCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([rec]) => rec);

    return {
      overallHealthScore,
      totalIssues,
      criticalIssues,
      securityRisks,
      performanceIssues,
      topRecommendations,
      databasesByHealth
    };
  }

  /**
   * Generate cache hash for database
   */
  private getCacheHash(db: DatabaseConnection): string {
    const crypto = require('crypto');
    return crypto.createHash('md5')
      .update(`${db.connectionString}_${this.config.quickMode ? 'quick' : 'full'}`)
      .digest('hex')
      .substring(0, 8);
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get batch analysis statistics
   */
  getStats() {
    return {
      config: this.config,
      cacheStats: this.cache.getStats()
    };
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
    this.emit('cache:cleared');
  }
}

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve(() => this.release());
      } else {
        this.waiting.push(() => {
          this.permits--;
          resolve(() => this.release());
        });
      }
    });
  }

  private release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!;
      next();
    }
  }
}
