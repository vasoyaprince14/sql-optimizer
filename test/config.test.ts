import { ConfigManager, configPresets, defaultConfig } from '../src/config';

describe('ConfigManager', () => {
  describe('Constructor', () => {
    it('should create instance with default config', () => {
      const manager = new ConfigManager();
      expect(manager).toBeInstanceOf(ConfigManager);
    });

    it('should merge user config with defaults', () => {
      const userConfig = {
        analysis: {
          securityLevel: 'strict' as const
        }
      };
      
      const manager = new ConfigManager(userConfig);
      const config = manager.getConfig();
      
      expect(config.analysis?.securityLevel).toBe('strict');
      expect(config.database?.host).toBe('localhost'); // Default value
    });
  });

  describe('Configuration Validation', () => {
    it('should validate correct configuration', () => {
      const manager = new ConfigManager({
        database: {
          host: 'localhost',
          database: 'test'
        }
      });
      
      const validation = manager.validateConfig();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid configuration', () => {
      const manager = new ConfigManager({
        ai: {
          enabled: true,
          // Missing API key
        }
      });
      
      const validation = manager.validateConfig();
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Environment Configuration', () => {
    it('should load from environment variables', () => {
      // Set test environment variables
      process.env.DB_HOST = 'testhost';
      process.env.DB_NAME = 'testdb';
      process.env.OPENAI_API_KEY = 'test-key';
      
      const manager = ConfigManager.fromEnvironment();
      const config = manager.getConfig();
      
      expect(config.database?.host).toBe('testhost');
      expect(config.database?.database).toBe('testdb');
      expect(config.ai?.apiKey).toBe('test-key');
      expect(config.ai?.enabled).toBe(true);
      
      // Clean up
      delete process.env.DB_HOST;
      delete process.env.DB_NAME;
      delete process.env.OPENAI_API_KEY;
    });
  });

  describe('Configuration Presets', () => {
    it('should have development preset', () => {
      expect(configPresets.development).toBeDefined();
      expect(configPresets.development.advanced?.verbose).toBe(true);
    });

    it('should have production preset', () => {
      expect(configPresets.production).toBeDefined();
      expect(configPresets.production.advanced?.verbose).toBe(false);
    });

    it('should have CI preset', () => {
      expect(configPresets.ci).toBeDefined();
      expect(configPresets.ci.reporting?.format).toBe('json');
    });

    it('should have comprehensive preset', () => {
      expect(configPresets.comprehensive).toBeDefined();
      expect(configPresets.comprehensive.analysis?.includeAIInsights).toBe(true);
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration', () => {
      const manager = new ConfigManager();
      
      manager.updateConfig({
        reporting: {
          format: 'html'
        }
      });
      
      const config = manager.getConfig();
      expect(config.reporting?.format).toBe('html');
    });

    it('should merge nested configuration updates', () => {
      const manager = new ConfigManager({
        ai: {
          enabled: false,
          provider: 'openai'
        }
      });
      
      manager.updateConfig({
        ai: {
          enabled: true
        }
      });
      
      const config = manager.getConfig();
      expect(config.ai?.enabled).toBe(true);
      expect(config.ai?.provider).toBe('openai'); // Should preserve existing value
    });
  });
});