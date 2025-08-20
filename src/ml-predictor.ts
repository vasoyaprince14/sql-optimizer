import { Client } from 'pg';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

export interface PerformancePrediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  timeframe: '1h' | '6h' | '24h' | '7d' | '30d';
  factors: string[];
  recommendations: string[];
}

export interface AnomalyDetection {
  metric: string;
  value: number;
  expectedRange: [number, number];
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  confidence: number;
  relatedMetrics: string[];
}

export interface CapacityPlanning {
  resource: string;
  currentUsage: number;
  predictedUsage: number;
  capacity: number;
  utilization: number;
  projectedExhaustion: Date | null;
  recommendations: string[];
  costImplications: string;
}

export interface QueryPattern {
  queryHash: string;
  queryText: string;
  executionCount: number;
  avgExecutionTime: number;
  totalExecutionTime: number;
  lastExecuted: Date;
  performanceTrend: 'improving' | 'degrading' | 'stable';
  optimizationPotential: number;
}

export interface PredictiveMaintenance {
  component: string;
  healthScore: number;
  predictedFailure: Date | null;
  confidence: number;
  maintenanceRecommendations: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  costSavings: string;
}

export class MLPredictor extends EventEmitter {
  private client: Client;
  private historicalData: Map<string, any[]> = new Map();
  private predictionModels: Map<string, any> = new Map();
  private anomalyThresholds: Map<string, [number, number]> = new Map();
  private isCollecting: boolean = false;
  private collectionInterval: NodeJS.Timeout | null = null;

  constructor(client: Client) {
    super();
    this.client = client;
    this.initializeThresholds();
  }

  /**
   * Initialize anomaly detection thresholds
   */
  private initializeThresholds(): void {
    // CPU usage thresholds
    this.anomalyThresholds.set('cpu_usage', [0, 80]);
    this.anomalyThresholds.set('memory_usage', [0, 85]);
    this.anomalyThresholds.set('disk_usage', [0, 90]);
    this.anomalyThresholds.set('connection_count', [0, 100]);
    this.anomalyThresholds.set('query_execution_time', [0, 5000]);
    this.anomalyThresholds.set('table_bloat_ratio', [0, 0.3]);
  }

  /**
   * Start collecting performance metrics for ML training
   */
  async startDataCollection(intervalMs: number = 60000): Promise<void> {
    if (this.isCollecting) {
      console.log('📊 Data collection already running');
      return;
    }

    console.log('🚀 Starting ML data collection...');
    this.isCollecting = true;

    this.collectionInterval = setInterval(async () => {
      await this.collectMetrics();
    }, intervalMs);

    // Collect initial data
    await this.collectMetrics();
  }

  /**
   * Stop data collection
   */
  stopDataCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    this.isCollecting = false;
    console.log('⏹️ ML data collection stopped');
  }

  /**
   * Collect current performance metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const timestamp = new Date();
      const metrics: any = { timestamp };

      // Database performance metrics
      const dbMetrics = await this.collectDatabaseMetrics();
      Object.assign(metrics, dbMetrics);

      // System resource metrics
      const systemMetrics = await this.collectSystemMetrics();
      Object.assign(metrics, systemMetrics);

      // Store metrics by category
      for (const [category, value] of Object.entries(metrics)) {
        if (category === 'timestamp') continue;
        
        if (!this.historicalData.has(category)) {
          this.historicalData.set(category, []);
        }
        
        this.historicalData.get(category)!.push({
          timestamp,
          value,
          category
        });

        // Keep only last 1000 data points per metric
        if (this.historicalData.get(category)!.length > 1000) {
          this.historicalData.get(category)!.shift();
        }
      }

      this.emit('metrics-collected', metrics);
    } catch (error) {
      console.error('❌ Error collecting metrics:', error);
    }
  }

  /**
   * Collect database-specific metrics
   */
  private async collectDatabaseMetrics(): Promise<any> {
    const metrics: any = {};

    try {
      // Active connections
      const connectionsResult = await this.client.query(`
        SELECT 
          count(*) as active_connections,
          max_conn as max_connections
        FROM pg_stat_activity, pg_settings 
        WHERE name = 'max_connections'
      `);
      
      if (connectionsResult.rows.length > 0) {
        const row = connectionsResult.rows[0];
        metrics.connection_count = parseInt(row.active_connections);
        metrics.connection_utilization = (parseInt(row.active_connections) / parseInt(row.max_connections)) * 100;
      }

      // Query performance
      const queryResult = await this.client.query(`
        SELECT 
          mean_exec_time,
          calls,
          total_exec_time
        FROM pg_stat_statements 
        ORDER BY total_exec_time DESC 
        LIMIT 1
      `);
      
      if (queryResult.rows.length > 0) {
        const row = queryResult.rows[0];
        metrics.avg_query_time = parseFloat(row.mean_exec_time) || 0;
        metrics.total_queries = parseInt(row.calls) || 0;
      }

      // Table bloat
      const bloatResult = await this.client.query(`
        SELECT 
          schemaname,
          tablename,
          n_dead_tup,
          n_live_tup
        FROM pg_stat_user_tables 
        WHERE n_dead_tup > 0
        ORDER BY n_dead_tup DESC 
        LIMIT 5
      `);
      
      if (bloatResult.rows.length > 0) {
        let totalBloat = 0;
        let totalRows = 0;
        
        for (const row of bloatResult.rows) {
          const dead = parseInt(row.n_dead_tup) || 0;
          const live = parseInt(row.n_live_tup) || 0;
          totalBloat += dead;
          totalRows += live + dead;
        }
        
        metrics.table_bloat_ratio = totalRows > 0 ? totalBloat / totalRows : 0;
      }

    } catch (error) {
      console.error('❌ Error collecting database metrics:', error);
    }

    return metrics;
  }

  /**
   * Collect system resource metrics
   */
  private async collectSystemMetrics(): Promise<any> {
    const metrics: any = {};

    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      metrics.memory_usage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      // CPU usage (simplified)
      const startUsage = process.cpuUsage();
      await new Promise(resolve => setTimeout(resolve, 100));
      const endUsage = process.cpuUsage(startUsage);
      metrics.cpu_usage = (endUsage.user + endUsage.system) / 1000000; // Convert to seconds

      // Disk usage (simplified - would need proper disk monitoring in production)
      metrics.disk_usage = 0; // Placeholder

    } catch (error) {
      console.error('❌ Error collecting system metrics:', error);
    }

    return metrics;
  }

  /**
   * Generate performance predictions
   */
  async generatePredictions(timeframe: '1h' | '6h' | '24h' | '7d' | '30d' = '24h'): Promise<PerformancePrediction[]> {
    console.log(`🔮 Generating ${timeframe} predictions...`);
    
    const predictions: PerformancePrediction[] = [];
    
    for (const [metric, data] of this.historicalData.entries()) {
      if (data.length < 10) continue; // Need minimum data points
      
      const prediction = await this.predictMetric(metric, data, timeframe);
      if (prediction) {
        predictions.push(prediction);
      }
    }

    console.log(`✅ Generated ${predictions.length} predictions`);
    this.emit('predictions-generated', predictions);
    
    return predictions;
  }

  /**
   * Predict a specific metric
   */
  private async predictMetric(metric: string, data: any[], timeframe: string): Promise<PerformancePrediction | null> {
    try {
      // Simple linear regression for prediction
      const recentData = data.slice(-20); // Last 20 data points
      const timestamps = recentData.map((d, i) => i);
      const values = recentData.map(d => d.value);

      // Calculate trend
      const trend = this.calculateTrend(values);
      
      // Simple prediction based on trend
      const currentValue = values[values.length - 1];
      const predictedValue = this.extrapolateValue(values, trend, timeframe);
      
      // Calculate confidence based on data consistency
      const confidence = this.calculateConfidence(values);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(metric, currentValue, predictedValue, trend);

      return {
        metric,
        currentValue,
        predictedValue,
        confidence,
        trend: trend > 0.1 ? 'increasing' : trend < -0.1 ? 'decreasing' : 'stable',
        timeframe: timeframe as any,
        factors: this.identifyFactors(metric, data),
        recommendations
      };
    } catch (error) {
      console.error(`❌ Error predicting ${metric}:`, error);
      return null;
    }
  }

  /**
   * Calculate trend from data points
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = values.length;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Extrapolate value based on trend and timeframe
   */
  private extrapolateValue(values: number[], trend: number, timeframe: string): number {
    const currentValue = values[values.length - 1];
    let multiplier = 1;
    
    switch (timeframe) {
      case '1h': multiplier = 1; break;
      case '6h': multiplier = 6; break;
      case '24h': multiplier = 24; break;
      case '7d': multiplier = 168; break;
      case '30d': multiplier = 720; break;
    }
    
    return Math.max(0, currentValue + (trend * multiplier));
  }

  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(values: number[]): number {
    if (values.length < 3) return 0.5;
    
    // Calculate coefficient of variation
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;
    
    // Higher CV = lower confidence
    return Math.max(0.1, Math.min(0.95, 1 - cv));
  }

  /**
   * Identify factors affecting the metric
   */
  private identifyFactors(metric: string, data: any[]): string[] {
    const factors: string[] = [];
    
    // Analyze correlations with other metrics
    for (const [otherMetric, otherData] of this.historicalData.entries()) {
      if (metric === otherMetric) continue;
      
      const correlation = this.calculateCorrelation(
        data.map(d => d.value),
        otherData.map(d => d.value)
      );
      
      if (Math.abs(correlation) > 0.7) {
        factors.push(`${otherMetric} (${correlation > 0 ? 'positive' : 'negative'} correlation)`);
      }
    }
    
    return factors.slice(0, 3); // Top 3 factors
  }

  /**
   * Calculate correlation between two arrays
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumY2 = y.reduce((a, b) => a + b * b, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Generate recommendations based on predictions
   */
  private generateRecommendations(metric: string, current: number, predicted: number, trend: number): string[] {
    const recommendations: string[] = [];
    
    if (metric === 'connection_count' && predicted > 80) {
      recommendations.push('Consider connection pooling or scaling database connections');
    }
    
    if (metric === 'memory_usage' && predicted > 90) {
      recommendations.push('Monitor memory usage and consider optimization or scaling');
    }
    
    if (metric === 'table_bloat_ratio' && predicted > 0.4) {
      recommendations.push('Schedule VACUUM operations to reduce table bloat');
    }
    
    if (metric === 'avg_query_time' && trend > 0) {
      recommendations.push('Investigate query performance degradation and optimize slow queries');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Current performance metrics are within acceptable ranges');
    }
    
    return recommendations;
  }

  /**
   * Detect anomalies in current metrics
   */
  async detectAnomalies(): Promise<AnomalyDetection[]> {
    console.log('🚨 Detecting anomalies...');
    
    const anomalies: AnomalyDetection[] = [];
    
    for (const [metric, data] of this.historicalData.entries()) {
      if (data.length < 5) continue;
      
      const currentValue = data[data.length - 1].value;
      const threshold = this.anomalyThresholds.get(metric);
      
      if (threshold) {
        const [min, max] = threshold;
        
        if (currentValue < min || currentValue > max) {
          const severity = this.calculateAnomalySeverity(currentValue, min, max);
          
          anomalies.push({
            metric,
            value: currentValue,
            expectedRange: [min, max],
            severity,
            description: this.describeAnomaly(metric, currentValue, min, max),
            detectedAt: new Date(),
            confidence: 0.8,
            relatedMetrics: this.findRelatedMetrics(metric)
          });
        }
      }
    }

    console.log(`✅ Detected ${anomalies.length} anomalies`);
    this.emit('anomalies-detected', anomalies);
    
    return anomalies;
  }

  /**
   * Calculate anomaly severity
   */
  private calculateAnomalySeverity(value: number, min: number, max: number): 'low' | 'medium' | 'high' | 'critical' {
    const range = max - min;
    const deviation = Math.max(
      Math.abs(value - min) / range,
      Math.abs(value - max) / range
    );
    
    if (deviation > 2.0) return 'critical';
    if (deviation > 1.5) return 'high';
    if (deviation > 1.0) return 'medium';
    return 'low';
  }

  /**
   * Describe the detected anomaly
   */
  private describeAnomaly(metric: string, value: number, min: number, max: number): string {
    if (value < min) {
      return `${metric} is below expected minimum (${value} < ${min})`;
    } else {
      return `${metric} is above expected maximum (${value} > ${max})`;
    }
  }

  /**
   * Find metrics related to the given metric
   */
  private findRelatedMetrics(metric: string): string[] {
    const related: string[] = [];
    
    // Simple heuristic for related metrics
    if (metric.includes('cpu')) {
      related.push('memory_usage', 'connection_count');
    } else if (metric.includes('memory')) {
      related.push('cpu_usage', 'connection_count');
    } else if (metric.includes('connection')) {
      related.push('cpu_usage', 'avg_query_time');
    }
    
    return related.slice(0, 3);
  }

  /**
   * Generate capacity planning insights
   */
  async generateCapacityPlanning(): Promise<CapacityPlanning[]> {
    console.log('📊 Generating capacity planning insights...');
    
    const insights: CapacityPlanning[] = [];
    
    // Analyze connection capacity
    const connectionData = this.historicalData.get('connection_count');
    if (connectionData && connectionData.length > 0) {
      const current = connectionData[connectionData.length - 1].value;
      const predicted = await this.predictMetric('connection_count', connectionData, '30d');
      
      if (predicted) {
        const maxConnections = 100; // This should come from actual database config
        const projectedExhaustion = predicted.predictedValue > maxConnections ? 
          new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) : null; // 15 days if over capacity
        
        insights.push({
          resource: 'Database Connections',
          currentUsage: current,
          predictedUsage: predicted.predictedValue,
          capacity: maxConnections,
          utilization: (current / maxConnections) * 100,
          projectedExhaustion,
          recommendations: projectedExhaustion ? [
            'Implement connection pooling',
            'Consider read replicas for read-heavy workloads',
            'Optimize connection usage in applications'
          ] : [
            'Current capacity is sufficient',
            'Monitor connection trends'
          ],
          costImplications: projectedExhaustion ? 
            'High - may require infrastructure scaling' : 
            'Low - current capacity adequate'
        });
      }
    }

    // Analyze memory capacity
    const memoryData = this.historicalData.get('memory_usage');
    if (memoryData && memoryData.length > 0) {
      const current = memoryData[memoryData.length - 1].value;
      const predicted = await this.predictMetric('memory_usage', memoryData, '30d');
      
      if (predicted) {
        const maxMemory = 100; // Percentage
        const projectedExhaustion = predicted.predictedValue > 95 ? 
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null; // 7 days if over 95%
        
        insights.push({
          resource: 'Memory Usage',
          currentUsage: current,
          predictedUsage: predicted.predictedValue,
          capacity: maxMemory,
          utilization: current,
          projectedExhaustion,
          recommendations: projectedExhaustion ? [
            'Optimize query memory usage',
            'Consider increasing memory allocation',
            'Implement query result caching'
          ] : [
            'Memory usage is healthy',
            'Continue monitoring'
          ],
          costImplications: projectedExhaustion ? 
            'Medium - may require memory upgrade' : 
            'Low - current memory adequate'
        });
      }
    }

    console.log(`✅ Generated ${insights.length} capacity planning insights`);
    this.emit('capacity-planning-generated', insights);
    
    return insights;
  }

  /**
   * Analyze query patterns for optimization opportunities
   */
  async analyzeQueryPatterns(): Promise<QueryPattern[]> {
    console.log('🔍 Analyzing query patterns...');
    
    try {
      const result = await this.client.query(`
        SELECT 
          queryid,
          query,
          calls,
          total_exec_time,
          mean_exec_time,
          last_call
        FROM pg_stat_statements 
        WHERE calls > 10
        ORDER BY total_exec_time DESC 
        LIMIT 20
      `);
      
      const patterns: QueryPattern[] = [];
      
      for (const row of result.rows) {
        const avgTime = parseFloat(row.mean_exec_time) || 0;
        const totalTime = parseFloat(row.total_exec_time) || 0;
        const calls = parseInt(row.calls) || 0;
        
        // Calculate performance trend (simplified)
        const performanceTrend = this.calculateQueryTrend(row.queryid);
        
        // Calculate optimization potential
        const optimizationPotential = this.calculateOptimizationPotential(avgTime, calls, totalTime);
        
        patterns.push({
          queryHash: row.queryid,
          queryText: row.query.substring(0, 100) + (row.query.length > 100 ? '...' : ''),
          executionCount: calls,
          avgExecutionTime: avgTime,
          totalExecutionTime: totalTime,
          lastExecuted: new Date(row.last_call),
          performanceTrend,
          optimizationPotential
        });
      }

      console.log(`✅ Analyzed ${patterns.length} query patterns`);
      this.emit('query-patterns-analyzed', patterns);
      
      return patterns;
    } catch (error) {
      console.error('❌ Error analyzing query patterns:', error);
      return [];
    }
  }

  /**
   * Calculate query performance trend
   */
  private calculateQueryTrend(queryId: string): 'improving' | 'degrading' | 'stable' {
    // This would need historical query performance data
    // For now, return stable
    return 'stable';
  }

  /**
   * Calculate optimization potential
   */
  private calculateOptimizationPotential(avgTime: number, calls: number, totalTime: number): number {
    // Higher potential for frequently executed slow queries
    const frequencyScore = Math.min(calls / 1000, 1); // Normalize to 0-1
    const timeScore = Math.min(avgTime / 1000, 1); // Normalize to 0-1
    
    return (frequencyScore + timeScore) / 2;
  }

  /**
   * Generate predictive maintenance recommendations
   */
  async generatePredictiveMaintenance(): Promise<PredictiveMaintenance[]> {
    console.log('🔧 Generating predictive maintenance recommendations...');
    
    const maintenance: PredictiveMaintenance[] = [];
    
    // Analyze table bloat for maintenance
    const bloatData = this.historicalData.get('table_bloat_ratio');
    if (bloatData && bloatData.length > 0) {
      const currentBloat = bloatData[bloatData.length - 1].value;
      const predictedBloat = await this.predictMetric('table_bloat_ratio', bloatData, '7d');
      
      if (predictedBloat && predictedBloat.predictedValue > 0.5) {
        const daysToFailure = Math.ceil((0.5 - currentBloat) / Math.abs(Number(predictedBloat.trend)));
        const predictedFailure = new Date(Date.now() + daysToFailure * 24 * 60 * 60 * 1000);
        
        maintenance.push({
          component: 'Table Bloat Management',
          healthScore: Math.max(0, 100 - (currentBloat * 100)),
          predictedFailure,
          confidence: predictedBloat.confidence,
          maintenanceRecommendations: [
            'Schedule VACUUM operations during low-traffic periods',
            'Implement regular maintenance windows',
            'Monitor bloat growth rate'
          ],
          urgency: predictedBloat.predictedValue > 0.7 ? 'critical' : 
                   predictedBloat.predictedValue > 0.5 ? 'high' : 'medium',
          costSavings: 'High - prevents performance degradation and potential downtime'
        });
      }
    }

    // Analyze index health
    const indexHealth = await this.analyzeIndexHealth();
    if (indexHealth.needsMaintenance) {
      maintenance.push({
        component: 'Index Maintenance',
        healthScore: indexHealth.healthScore,
        predictedFailure: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
        confidence: 0.7,
        maintenanceRecommendations: [
          'Rebuild fragmented indexes',
          'Update table statistics',
          'Monitor index usage patterns'
        ],
        urgency: 'medium',
        costSavings: 'Medium - maintains query performance'
      });
    }

    console.log(`✅ Generated ${maintenance.length} maintenance recommendations`);
    this.emit('maintenance-generated', maintenance);
    
    return maintenance;
  }

  /**
   * Analyze index health
   */
  private async analyzeIndexHealth(): Promise<{ needsMaintenance: boolean; healthScore: number }> {
    try {
      const result = await this.client.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes 
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
        LIMIT 50
      `);
      
      let totalIndexes = 0;
      let healthyIndexes = 0;
      
      for (const row of result.rows) {
        totalIndexes++;
        const scans = parseInt(row.idx_scan) || 0;
        const reads = parseInt(row.idx_tup_read) || 0;
        const fetches = parseInt(row.idx_tup_fetch) || 0;
        
        // Simple health check: index should be used and efficient
        if (scans > 0 && fetches > 0 && (fetches / reads) > 0.1) {
          healthyIndexes++;
        }
      }
      
      const healthScore = totalIndexes > 0 ? (healthyIndexes / totalIndexes) * 100 : 100;
      const needsMaintenance = healthScore < 70;
      
      return { needsMaintenance, healthScore };
    } catch (error) {
      console.error('❌ Error analyzing index health:', error);
      return { needsMaintenance: false, healthScore: 100 };
    }
  }

  /**
   * Export ML insights report
   */
  async exportMLReport(format: 'json' | 'html' = 'json'): Promise<string> {
    console.log('📄 Generating ML insights report...');
    
    const predictions = await this.generatePredictions('7d');
    const anomalies = await this.detectAnomalies();
    const capacityPlanning = await this.generateCapacityPlanning();
    const queryPatterns = await this.analyzeQueryPatterns();
    const maintenance = await this.generatePredictiveMaintenance();
    
    const report = {
      timestamp: new Date(),
      predictions,
      anomalies,
      capacityPlanning,
      queryPatterns,
      maintenance,
      summary: {
        totalPredictions: predictions.length,
        totalAnomalies: anomalies.length,
        criticalIssues: anomalies.filter(a => a.severity === 'critical').length,
        maintenanceRequired: maintenance.filter(m => m.urgency === 'critical' || m.urgency === 'high').length
      }
    };
    
    if (format === 'json') {
      const reportPath = `./reports/ml-insights-${Date.now()}.json`;
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`✅ ML report saved to: ${reportPath}`);
      return reportPath;
    }
    
    throw new Error(`Format ${format} not yet supported`);
  }

  /**
   * Get ML model statistics
   */
  getModelStats(): any {
    const stats: any = {
      totalMetrics: this.historicalData.size,
      totalDataPoints: 0,
      dataCollectionActive: this.isCollecting,
      modelsTrained: this.predictionModels.size
    };
    
    for (const data of this.historicalData.values()) {
      stats.totalDataPoints += data.length;
    }
    
    return stats;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up ML predictor...');
    this.stopDataCollection();
    this.removeAllListeners();
    console.log('✅ ML predictor cleaned up');
  }
}
