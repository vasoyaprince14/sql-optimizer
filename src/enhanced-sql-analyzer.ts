import { Client } from 'pg';
import { EnhancedDatabaseHealthAuditor, EnhancedDatabaseHealthReport } from './enhanced-database-auditor';
import { EnhancedReportGenerator } from './enhanced-report-generator';
import { ConfigManager, SqlAnalyzerConfig, configPresets } from './config';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';

export interface AnalysisOptions {
  format?: 'cli' | 'html' | 'json';
  outputPath?: string;
  includeAI?: boolean;
  preset?: keyof typeof configPresets;
  customConfig?: Partial<SqlAnalyzerConfig>;
}

export class EnhancedSQLAnalyzer {
  private configManager: ConfigManager;
  private client: Client;
  private auditor: EnhancedDatabaseHealthAuditor;
  private reportGenerator: EnhancedReportGenerator;

  constructor(connectionConfig: any, options?: AnalysisOptions) {
    // Initialize configuration
    let baseConfig = new ConfigManager();
    
    // Apply preset if specified
    if (options?.preset) {
      baseConfig.updateConfig(configPresets[options.preset]);
    }
    
    // Apply custom config
    if (options?.customConfig) {
      baseConfig.updateConfig(options.customConfig);
    }

    // Override with connection and analysis options
    baseConfig.updateConfig({
      database: { ...connectionConfig },
      analysis: {
        includeAIInsights: options?.includeAI ?? false
      },
      reporting: {
        format: options?.format ?? 'html',
        outputPath: options?.outputPath ?? './reports'
      }
    });

    this.configManager = baseConfig;

    // Validate configuration
    const validation = this.configManager.validateConfig();
    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }

    // Initialize database client
    this.client = new Client(this.getConnectionConfig());
    
    // Initialize components
    const config = this.configManager.getConfig();
    this.auditor = new EnhancedDatabaseHealthAuditor(this.client, {
      enableAI: config.ai?.enabled,
      openaiApiKey: config.ai?.apiKey
    });
    
    this.reportGenerator = new EnhancedReportGenerator();
  }

  /**
   * Perform comprehensive database analysis
   */
  async analyze(): Promise<EnhancedDatabaseHealthReport> {
    const config = this.configManager.getConfig();
    
    try {
      console.log('🔗 Connecting to database...');
      await this.client.connect();
      
      console.log('🔍 Starting comprehensive database analysis...');
      const startTime = Date.now();
      
      const report = await this.auditor.performComprehensiveAudit();
      
      const duration = Date.now() - startTime;
      console.log(`✅ Analysis completed in ${duration}ms`);
      
      return report;
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      throw error;
    } finally {
      await this.client.end();
    }
  }

  /**
   * Generate and save report
   */
  async generateReport(report: EnhancedDatabaseHealthReport): Promise<string> {
    const config = this.configManager.getConfig();
    const format = config.reporting?.format || 'html';
    const outputPath = config.reporting?.outputPath || './reports';

    let reportContent: string;
    let fileName: string;
    let fileExtension: string;

    switch (format) {
      case 'html':
        // Attach report to AI insights block for strategic recs
        const aiAttached = report.aiInsights ? { ...report.aiInsights, __report: report } : undefined;
        const reportWithAI = aiAttached ? { ...report, aiInsights: aiAttached as any } : report;
        reportContent = this.reportGenerator.generateEnhancedHTMLReport(reportWithAI as any);
        fileExtension = 'html';
        fileName = `database-health-report-${this.getTimestamp()}.html`;
        break;
        
      case 'cli':
        reportContent = this.reportGenerator.generateEnhancedCLIReport(report);
        fileExtension = 'txt';
        fileName = `database-health-report-${this.getTimestamp()}.txt`;
        break;
        
      case 'json':
        reportContent = JSON.stringify(report, null, 2);
        fileExtension = 'json';
        fileName = `database-health-report-${this.getTimestamp()}.json`;
        break;
        
      default:
        throw new Error(`Unsupported report format: ${format}`);
    }

    // Ensure output directory exists
    await this.ensureDirectoryExists(outputPath);
    
    // Write report file
    const fullPath = join(outputPath, fileName);
    await fs.writeFile(fullPath, reportContent, 'utf-8');
    
    console.log(`📄 Report saved to: ${fullPath}`);
    return fullPath;
  }

  /**
   * Analyze and generate report in one step
   */
  async analyzeAndReport(options?: { 
    returnReport?: boolean; 
    skipSave?: boolean;
    onProgress?: (step: string, progress: number) => void;
  }): Promise<{ 
    reportPath?: string; 
    report?: EnhancedDatabaseHealthReport; 
    summary: AnalysisSummary 
  }> {
    const onProgress = options?.onProgress || (() => {});
    
    onProgress('Starting analysis...', 0);
    
    // Perform analysis
    const report = await this.analyze();
    onProgress('Analysis complete, generating report...', 70);
    
    // Generate summary
    const summary = this.generateSummary(report);
    onProgress('Summary generated...', 85);
    
    let reportPath: string | undefined;
    
    // Save report unless skipped
    if (!options?.skipSave) {
      reportPath = await this.generateReport(report);
      onProgress('Report saved...', 95);
    }
    
    onProgress('Complete!', 100);
    
    return {
      reportPath,
      report: options?.returnReport ? report : undefined,
      summary
    };
  }

  /**
   * Generate executive summary
   */
  generateSummary(report: EnhancedDatabaseHealthReport): AnalysisSummary {
    const criticalIssues = [
      ...report.securityAnalysis.vulnerabilities.filter(v => v.severity === 'critical'),
      ...report.performanceIssues.filter(i => i.severity === 'critical')
    ];

    const totalIssues = report.securityAnalysis.vulnerabilities.length + 
                       report.performanceIssues.length +
                       report.tableAnalysis.tablesWithoutPK.length +
                       report.tableAnalysis.tablesWithBloat.length;

    return {
      overallScore: report.schemaHealth.overall,
      totalIssues,
      criticalIssues: criticalIssues.length,
      securityRisk: this.calculateSecurityRisk(report),
      performanceRisk: this.calculatePerformanceRisk(report),
      costSavingsPotential: report.costAnalysis.optimizationSavings.monthly,
      topRecommendations: this.getTopRecommendations(report),
      estimatedImplementationTime: this.estimateImplementationTime(report),
      riskLevel: this.calculateOverallRisk(report)
    };
  }

  /**
   * Get configuration for easy access
   */
  getConfig(): SqlAnalyzerConfig {
    return this.configManager.getConfig();
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<SqlAnalyzerConfig>): void {
    this.configManager.updateConfig(updates);
  }

  private getConnectionConfig(): any {
    const dbConfig = this.configManager.getConfig().database;
    
    if (dbConfig?.connectionString) {
      return { connectionString: dbConfig.connectionString };
    }
    
    return {
      host: dbConfig?.host,
      port: dbConfig?.port,
      database: dbConfig?.database,
      user: dbConfig?.user,
      password: dbConfig?.password,
      ssl: dbConfig?.ssl
    };
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private getTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  }

  private calculateSecurityRisk(report: EnhancedDatabaseHealthReport): 'low' | 'medium' | 'high' | 'critical' {
    const criticalVulns = report.securityAnalysis.vulnerabilities.filter(v => v.severity === 'critical').length;
    const highVulns = report.securityAnalysis.vulnerabilities.filter(v => v.severity === 'high').length;
    
    if (criticalVulns > 0) return 'critical';
    if (highVulns > 2) return 'high';
    if (highVulns > 0 || report.securityAnalysis.vulnerabilities.length > 3) return 'medium';
    return 'low';
  }

  private calculatePerformanceRisk(report: EnhancedDatabaseHealthReport): 'low' | 'medium' | 'high' | 'critical' {
    const criticalIssues = report.performanceIssues.filter(i => i.severity === 'critical').length;
    const highIssues = report.performanceIssues.filter(i => i.severity === 'high').length;
    const bloatedTables = report.tableAnalysis.tablesWithBloat.length;
    
    if (criticalIssues > 0) return 'critical';
    if (highIssues > 1 || bloatedTables > 5) return 'high';
    if (highIssues > 0 || bloatedTables > 2) return 'medium';
    return 'low';
  }

  private calculateOverallRisk(report: EnhancedDatabaseHealthReport): 'low' | 'medium' | 'high' | 'critical' {
    const securityRisk = this.calculateSecurityRisk(report);
    const performanceRisk = this.calculatePerformanceRisk(report);
    
    if (securityRisk === 'critical' || performanceRisk === 'critical') return 'critical';
    if (securityRisk === 'high' || performanceRisk === 'high') return 'high';
    if (securityRisk === 'medium' || performanceRisk === 'medium') return 'medium';
    return 'low';
  }

  private getTopRecommendations(report: EnhancedDatabaseHealthReport): string[] {
    const recommendations: { text: string; priority: number }[] = [];
    
    // Add security recommendations
    report.securityAnalysis.vulnerabilities
      .filter(v => v.severity === 'critical' || v.severity === 'high')
      .forEach(v => {
        recommendations.push({
          text: `Security: ${v.description}`,
          priority: v.severity === 'critical' ? 10 : 8
        });
      });
    
    // Add performance recommendations
    report.performanceIssues
      .filter(i => i.severity === 'critical' || i.severity === 'high')
      .forEach(i => {
        recommendations.push({
          text: `Performance: ${i.description}`,
          priority: i.severity === 'critical' ? 9 : 7
        });
      });
    
    // Add table bloat recommendations
    if (report.tableAnalysis.tablesWithBloat.length > 0) {
      recommendations.push({
        text: `Clean up ${report.tableAnalysis.tablesWithBloat.length} bloated tables`,
        priority: 6
      });
    }
    
    // Add AI insights if available
    if (report.aiInsights?.priorityRecommendations) {
      report.aiInsights.priorityRecommendations.forEach(rec => {
        recommendations.push({
          text: `AI Insight: ${rec}`,
          priority: 5
        });
      });
    }
    
    return recommendations
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5)
      .map(r => r.text);
  }

  private estimateImplementationTime(report: EnhancedDatabaseHealthReport): string {
    const totalIssues = report.securityAnalysis.vulnerabilities.length + 
                       report.performanceIssues.length +
                       report.tableAnalysis.tablesWithBloat.length;
    
    if (totalIssues === 0) return '0 hours';
    if (totalIssues <= 3) return '2-4 hours';
    if (totalIssues <= 8) return '1-2 days';
    if (totalIssues <= 15) return '3-5 days';
    return '1-2 weeks';
  }

  /**
   * Static method to quickly analyze a database with minimal setup
   */
  static async quickAnalysis(
    connectionString: string, 
    options?: { 
      format?: 'cli' | 'html' | 'json';
      includeAI?: boolean;
      outputPath?: string;
    }
  ): Promise<AnalysisSummary> {
    const analyzer = new EnhancedSQLAnalyzer(
      { connectionString },
      {
        format: options?.format || 'html',
        includeAI: options?.includeAI || false,
        outputPath: options?.outputPath || './reports',
        preset: 'development'
      }
    );

    const result = await analyzer.analyzeAndReport({ skipSave: false });
    return result.summary;
  }

  /**
   * Static method for CI/CD environments
   */
  static async ciAnalysis(connectionString: string): Promise<{
    passed: boolean;
    score: number;
    criticalIssues: number;
    reportPath: string;
  }> {
    const analyzer = new EnhancedSQLAnalyzer(
      { connectionString },
      {
        preset: 'ci',
        format: 'json'
      }
    );

    const result = await analyzer.analyzeAndReport();
    const passed = result.summary.criticalIssues === 0 && result.summary.overallScore >= 7;

    return {
      passed,
      score: result.summary.overallScore,
      criticalIssues: result.summary.criticalIssues,
      reportPath: result.reportPath!
    };
  }
}

export interface AnalysisSummary {
  overallScore: number;
  totalIssues: number;
  criticalIssues: number;
  securityRisk: 'low' | 'medium' | 'high' | 'critical';
  performanceRisk: 'low' | 'medium' | 'high' | 'critical';
  costSavingsPotential: number;
  topRecommendations: string[];
  estimatedImplementationTime: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// Export for NPM package
export default EnhancedSQLAnalyzer;
export { ConfigManager, configPresets, type SqlAnalyzerConfig };