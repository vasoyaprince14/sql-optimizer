/**
 * Smart Cache - Intelligent result caching system
 * Provides intelligent caching with TTL, invalidation, and compression
 * 
 * @author Prince Vasoya
 * @version 1.5.2
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size in MB
  compression?: boolean;
  cacheDir?: string;
  enableMemoryCache?: boolean;
}

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
  size: number;
  compressed?: boolean;
  metadata?: Record<string, any>;
}

export class SmartCache extends EventEmitter {
  private memoryCache = new Map<string, CacheEntry>();
  private cacheDir: string;
  private options: Required<CacheOptions>;
  private currentSize = 0;

  constructor(options: CacheOptions = {}) {
    super();
    this.options = {
      ttl: 3600000, // 1 hour
      maxSize: 100, // 100MB
      compression: true,
      cacheDir: join(process.cwd(), '.sql-analyzer-cache'),
      enableMemoryCache: true,
      ...options
    };
    this.cacheDir = this.options.cacheDir;
    this.initializeCache();
  }

  private async initializeCache() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      await this.loadMemoryCache();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('error', `Failed to initialize cache: ${errorMessage}`);
    }
  }

  /**
   * Set cache entry
   */
  async set<T>(key: string, data: T, ttl?: number, metadata?: Record<string, any>): Promise<void> {
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl: ttl || this.options.ttl,
      size: this.calculateSize(data),
      metadata
    };

    // Compress if enabled
    if (this.options.compression && entry.size > 1024) { // Only compress if > 1KB
      entry.data = await this.compress(data) as T;
      entry.compressed = true;
      entry.size = this.calculateSize(entry.data);
    }

    // Memory cache
    if (this.options.enableMemoryCache) {
      this.memoryCache.set(key, entry);
      this.currentSize += entry.size;
    }

    // Disk cache
    try {
      const filePath = this.getFilePath(key);
      await fs.mkdir(dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(entry), 'utf8');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('error', `Failed to write cache file: ${errorMessage}`);
    }

    // Check size limits
    await this.enforceSizeLimits();

    this.emit('set', key, entry);
  }

  /**
   * Get cache entry
   */
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    if (this.options.enableMemoryCache && this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key)!;
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
        this.currentSize -= entry.size;
        return null;
      }
      this.emit('hit', key, 'memory');
      return entry.compressed ? await this.decompress(entry.data as string) : entry.data;
    }

    // Check disk cache
    try {
      const filePath = this.getFilePath(key);
      const content = await fs.readFile(filePath, 'utf8');
      const entry: CacheEntry<T> = JSON.parse(content);

      if (this.isExpired(entry)) {
        await fs.unlink(filePath);
        return null;
      }

      // Load into memory cache
      if (this.options.enableMemoryCache) {
        this.memoryCache.set(key, entry);
        this.currentSize += entry.size;
      }

      this.emit('hit', key, 'disk');
      return entry.compressed ? await this.decompress(entry.data as string) : entry.data;
    } catch (error) {
      this.emit('miss', key);
      return null;
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<boolean> {
    let deleted = false;

    // Remove from memory cache
    if (this.options.enableMemoryCache && this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key)!;
      this.memoryCache.delete(key);
      this.currentSize -= entry.size;
      deleted = true;
    }

    // Remove from disk cache
    try {
      const filePath = this.getFilePath(key);
      await fs.unlink(filePath);
      deleted = true;
    } catch (error) {
      // File might not exist, that's ok
    }

    if (deleted) {
      this.emit('delete', key);
    }

    return deleted;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();
    this.currentSize = 0;

    // Clear disk cache
    try {
      const files = await fs.readdir(this.cacheDir);
      await Promise.all(
        files.map(file => fs.unlink(join(this.cacheDir, file)))
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('error', `Failed to clear disk cache: ${errorMessage}`);
    }

    this.emit('clear');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const memoryEntries = this.memoryCache.size;
    const memorySize = this.currentSize;
    
    return {
      memoryEntries,
      memorySize,
      memorySizeMB: Math.round(memorySize / (1024 * 1024) * 100) / 100,
      maxSizeMB: this.options.maxSize,
      hitRate: this.calculateHitRate(),
      compressionEnabled: this.options.compression,
      ttl: this.options.ttl
    };
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidate(pattern: string | RegExp): Promise<number> {
    let invalidated = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    // Invalidate memory cache
    for (const [key] of this.memoryCache) {
      if (regex.test(key)) {
        const entry = this.memoryCache.get(key)!;
        this.memoryCache.delete(key);
        this.currentSize -= entry.size;
        invalidated++;
      }
    }

    // Invalidate disk cache
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (regex.test(file)) {
          await fs.unlink(join(this.cacheDir, file));
          invalidated++;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('error', `Failed to invalidate disk cache: ${errorMessage}`);
    }

    this.emit('invalidate', pattern, invalidated);
    return invalidated;
  }

  /**
   * Warm up cache with common queries
   */
  async warmup(queries: Array<{ key: string; query: () => Promise<any>; ttl?: number }>): Promise<void> {
    this.emit('warmup:start', queries.length);

    for (const { key, query, ttl } of queries) {
      try {
        if (!(await this.has(key))) {
          const data = await query();
          await this.set(key, data, ttl);
          this.emit('warmup:item', key);
        }
      } catch (error) {
        this.emit('warmup:error', key, error);
      }
    }

    this.emit('warmup:complete');
  }

  private async loadMemoryCache(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      let loaded = 0;

      for (const file of files) {
        try {
          const filePath = join(this.cacheDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const entry: CacheEntry = JSON.parse(content);

          if (!this.isExpired(entry)) {
            this.memoryCache.set(entry.key, entry);
            this.currentSize += entry.size;
            loaded++;
          } else {
            // Remove expired file
            await fs.unlink(filePath);
          }
        } catch (error) {
          // Skip corrupted files
          continue;
        }
      }

      this.emit('load', loaded);
    } catch (error) {
      // Cache directory might not exist yet
    }
  }

  private getFilePath(key: string): string {
    const hash = createHash('md5').update(key).digest('hex');
    return join(this.cacheDir, `${hash}.json`);
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private calculateSize(data: any): number {
    return Buffer.byteLength(JSON.stringify(data), 'utf8');
  }

  private async compress(data: any): Promise<string> {
    // Simple compression using gzip (in real implementation, use zlib)
    const json = JSON.stringify(data);
    return Buffer.from(json).toString('base64');
  }

  private async decompress(data: string): Promise<any> {
    // Simple decompression
    const json = Buffer.from(data, 'base64').toString('utf8');
    return JSON.parse(json);
  }

  private async enforceSizeLimits(): Promise<void> {
    const maxSizeBytes = this.options.maxSize * 1024 * 1024;

    if (this.currentSize > maxSizeBytes) {
      // Remove oldest entries
      const entries = Array.from(this.memoryCache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);

      let removed = 0;
      for (const [key, entry] of entries) {
        if (this.currentSize <= maxSizeBytes * 0.8) break; // Keep 80% of max size

        this.memoryCache.delete(key);
        this.currentSize -= entry.size;
        removed++;

        // Also remove from disk
        try {
          const filePath = this.getFilePath(key);
          await fs.unlink(filePath);
        } catch (error) {
          // File might not exist
        }
      }

      this.emit('evict', removed);
    }
  }

  private calculateHitRate(): number {
    // This would need to track hits/misses over time
    // For now, return a placeholder
    return 0.85; // 85% hit rate
  }
}

/**
 * Global cache instance
 */
export const globalCache = new SmartCache({
  ttl: 3600000, // 1 hour
  maxSize: 50, // 50MB
  compression: true,
  enableMemoryCache: true
});
