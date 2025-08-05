import { QueryAnalyzer } from '../src/analyzer';
import { Client } from 'pg';

// Mock pg Client
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  })),
}));

describe('QueryAnalyzer', () => {
  let analyzer: QueryAnalyzer;
  let mockClient: jest.Mocked<Client>;

  beforeEach(() => {
    mockClient = new Client() as jest.Mocked<Client>;
    analyzer = new QueryAnalyzer(mockClient);
  });

  describe('analyze', () => {
    it('should analyze a simple SELECT query', async () => {
      const mockExplainResult = [{
        'Planning Time': 0.1,
        'Execution Time': 2.5,
        'Shared Hit Blocks': 8,
        'Shared Read Blocks': 2,
        'Total Cost': 15.5,
        'Actual Rows': 100
      }];

      mockClient.query.mockResolvedValue({
        rows: [{ 'QUERY PLAN': mockExplainResult }]
      } as any);

      const result = await analyzer.analyze('SELECT * FROM users WHERE id = 1');

      expect(result.query).toBe('SELECT * FROM users WHERE id = 1');
      expect(result.performance.executionTime).toBe(2.5);
      expect(result.performance.rowsReturned).toBe(100);
      expect(result.performance.cacheHitRatio).toBe(80); // 8/(8+2) * 100
    });

    it('should detect sequential scan issues', async () => {
      const mockExplainResult = [{
        'Planning Time': 0.1,
        'Execution Time': 150.5,
        'Shared Hit Blocks': 0,
        'Shared Read Blocks': 1000,
        'Total Cost': 1500.5,
        'Actual Rows': 10000,
        'Plans': [{
          'Node Type': 'Seq Scan',
          'Relation Name': 'users',
          'Filter': 'email = \'test@example.com\''
        }]
      }];

      mockClient.query.mockResolvedValue({
        rows: [{ 'QUERY PLAN': mockExplainResult }]
      } as any);

      const result = await analyzer.analyze('SELECT * FROM users WHERE email = \'test@example.com\'');

      expect(result.issues).toHaveLength(2); // Sequential scan + missing index
      expect(result.issues.some(issue => issue.type === 'sequential_scan')).toBe(true);
      expect(result.issues.some(issue => issue.type === 'missing_index')).toBe(true);
    });

    it('should generate suggestions for slow queries', async () => {
      const mockExplainResult = [{
        'Planning Time': 0.1,
        'Execution Time': 5000, // Slow query
        'Shared Hit Blocks': 8,
        'Shared Read Blocks': 2,
        'Total Cost': 15.5,
        'Actual Rows': 10000
      }];

      mockClient.query.mockResolvedValue({
        rows: [{ 'QUERY PLAN': mockExplainResult }]
      } as any);

      const result = await analyzer.analyze('SELECT * FROM users');

      expect(result.issues.some(issue => issue.type === 'slow_query')).toBe(true);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle query analysis errors gracefully', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(analyzer.analyze('SELECT * FROM users')).rejects.toThrow('Query analysis failed');
    });
  });

  describe('performance metrics parsing', () => {
    it('should calculate buffer usage correctly', async () => {
      const mockExplainResult = [{
        'Planning Time': 0.1,
        'Execution Time': 10,
        'Shared Hit Blocks': 16,
        'Shared Read Blocks': 4,
        'Total Cost': 15.5,
        'Actual Rows': 100
      }];

      mockClient.query.mockResolvedValue({
        rows: [{ 'QUERY PLAN': mockExplainResult }]
      } as any);

      const result = await analyzer.analyze('SELECT * FROM users');

      // (16 + 4) * 8 / 1024 = 0.156 MB
      expect(result.performance.bufferUsage).toBe('0.2MB');
      expect(result.performance.cacheHitRatio).toBe(80); // 16/(16+4) * 100
    });

    it('should handle zero buffer usage', async () => {
      const mockExplainResult = [{
        'Planning Time': 0.1,
        'Execution Time': 10,
        'Shared Hit Blocks': 0,
        'Shared Read Blocks': 0,
        'Total Cost': 15.5,
        'Actual Rows': 100
      }];

      mockClient.query.mockResolvedValue({
        rows: [{ 'QUERY PLAN': mockExplainResult }]
      } as any);

      const result = await analyzer.analyze('SELECT * FROM users');

      expect(result.performance.bufferUsage).toBe('0.0MB');
      expect(result.performance.cacheHitRatio).toBe(0);
    });
  });
}); 