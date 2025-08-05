import { Client } from 'pg';
import { BenchmarkResult, PerformanceMetrics } from './types';

export class Benchmarker {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Benchmark a query with multiple iterations
   */
  async benchmark(sql: string, iterations: number = 5): Promise<BenchmarkResult> {
    const results: PerformanceMetrics[] = [];
    
    // Warm up the database
    await this.warmUp(sql);
    
    // Run benchmark iterations
    for (let i = 0; i < iterations; i++) {
      const result = await this.runSingleBenchmark(sql);
      results.push(result);
      
      // Small delay between iterations
      await this.delay(100);
    }
    
    // Calculate statistics
    const times = results.map(r => r.executionTime);
    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const standardDeviation = this.calculateStandardDeviation(times, averageTime);
    
    return {
      query: sql,
      iterations,
      averageTime,
      minTime,
      maxTime,
      standardDeviation,
      results
    };
  }

  /**
   * Run a single benchmark iteration
   */
  private async runSingleBenchmark(sql: string): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    
    try {
      const result = await this.client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
      const executionPlan = result.rows[0]['QUERY PLAN'];
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Parse performance metrics from execution plan
      const performance = this.parsePerformanceMetrics(executionPlan);
      performance.executionTime = executionTime;
      
      return performance;
    } catch (error) {
      throw new Error(`Benchmark execution failed: ${error}`);
    }
  }

  /**
   * Warm up the database before benchmarking
   */
  private async warmUp(sql: string): Promise<void> {
    try {
      // Run the query a few times to warm up caches
      for (let i = 0; i < 3; i++) {
        await this.client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`);
        await this.delay(50);
      }
    } catch (error) {
      console.warn('Warm up failed:', error);
    }
  }

  /**
   * Parse performance metrics from execution plan
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
    const totalBlocks = sharedHitBlocks + sharedReadBlocks;
    const cacheHitRatio = totalBlocks > 0 ? (sharedHitBlocks / totalBlocks) * 100 : 0;
    
    // Calculate buffer usage in MB (assuming 8KB blocks)
    const bufferUsageMB = (totalBlocks * 8) / 1024;
    const bufferUsage = `${bufferUsageMB.toFixed(1)}MB`;
    
    // Estimate rows returned
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
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[], mean: number): number {
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Compare two queries
   */
  async compareQueries(query1: string, query2: string, iterations: number = 5): Promise<{
    query1: BenchmarkResult;
    query2: BenchmarkResult;
    improvement: number;
    recommendation: string;
  }> {
    const result1 = await this.benchmark(query1, iterations);
    const result2 = await this.benchmark(query2, iterations);
    
    const improvement = ((result1.averageTime - result2.averageTime) / result1.averageTime) * 100;
    
    let recommendation = '';
    if (improvement > 0) {
      recommendation = `Query 2 is ${improvement.toFixed(2)}% faster than Query 1`;
    } else {
      recommendation = `Query 1 is ${Math.abs(improvement).toFixed(2)}% faster than Query 2`;
    }
    
    return {
      query1: result1,
      query2: result2,
      improvement,
      recommendation
    };
  }

  /**
   * Benchmark with different data sizes
   */
  async benchmarkWithDataSizes(sql: string, dataSizes: number[] = [1000, 10000, 100000]): Promise<{
    dataSize: number;
    result: BenchmarkResult;
  }[]> {
    const results = [];
    
    for (const size of dataSizes) {
      // Create test data of specified size
      await this.createTestData(size);
      
      // Benchmark the query
      const result = await this.benchmark(sql, 3);
      
      results.push({
        dataSize: size,
        result
      });
    }
    
    return results;
  }

  /**
   * Create test data for benchmarking
   */
  private async createTestData(size: number): Promise<void> {
    try {
      // Create a test table if it doesn't exist
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS benchmark_test (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100),
          email VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW(),
          status VARCHAR(20)
        )
      `);
      
      // Clear existing data
      await this.client.query('DELETE FROM benchmark_test');
      
      // Insert test data
      const values = [];
      for (let i = 0; i < size; i++) {
        values.push(`(${i}, 'User${i}', 'user${i}@example.com', NOW(), 'active')`);
      }
      
      await this.client.query(`
        INSERT INTO benchmark_test (id, name, email, created_at, status)
        VALUES ${values.join(', ')}
      `);
    } catch (error) {
      console.warn('Failed to create test data:', error);
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 