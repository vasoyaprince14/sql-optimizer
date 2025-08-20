import { Client } from 'pg';
import { EnhancedDatabaseHealthAuditor, EnhancedDatabaseHealthReport } from './enhanced-database-auditor';
import { EnhancedReportGenerator } from './enhanced-report-generator';
import { ConfigManager, SqlAnalyzerConfig, configPresets } from './config';
import { EnterpriseFeatures } from './enterprise-features';
import { MLPredictor } from './ml-predictor';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';

export interface AnalysisOptions {
  preset?: keyof typeof configPresets;
  customConfig?: Partial<SqlAnalyzerConfig>;
  enableEnterpriseFeatures?: boolean;
  enableMLPredictor?: boolean;
  enableComplianceAudit?: boolean;
  enablePredictiveMaintenance?: boolean;
  format?: 'cli' | 'html' | 'json' | 'md';
  outputPath?: string;
  includeAI?: boolean;
}

export interface EnhancedAnalysisResult {
  healthReport: EnhancedDatabaseHealthReport;
  enterpriseFeatures?: {
    complianceStatus?: any;
    governanceStatus?: any;
    intelligentRecommendations?: any[];
  };
  mlInsights?: {
    predictions?: any[];
    anomalies?: any[];
    capacityPlanning?: any[];
    queryPatterns?: any[];
    predictiveMaintenance?: any[];
  };
  summary: AnalysisSummary;
}

export interface AnalysisSummary {
  overallScore: number;
  totalIssues: number;
  criticalIssues: number;
  securityRisk: 'low' | 'medium' | 'high' | 'critical';
  performanceRisk: 'low' | 'medium' | 'high' | 'critical';
  costSavingsPotential: string;
  topRecommendations: string[];
  estimatedImplementationTime: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  complianceStatus?: 'compliant' | 'non-compliant' | 'partial';
  mlInsights?: {
    totalPredictions: number;
    totalAnomalies: number;
    criticalAnomalies: number;
    maintenanceRequired: number;
  };
}

export class EnhancedSQLAnalyzer {
  private client: Client;
  private configManager: ConfigManager;
  private auditor: EnhancedDatabaseHealthAuditor;
  private reportGenerator: EnhancedReportGenerator;
  private enterpriseFeatures?: EnterpriseFeatures;
  private mlPredictor?: MLPredictor;

  constructor(connectionConfig: any, options?: AnalysisOptions) {
    this.client = new Client(this.getConnectionConfig());
    this.configManager = new ConfigManager();
    
    if (options?.customConfig) {
      this.configManager.updateConfig(options.customConfig);
    }
    
    // Apply preset if specified
    if (options?.preset && configPresets[options.preset]) {
      this.configManager.updateConfig(configPresets[options.preset]);
    }
    
    this.auditor = new EnhancedDatabaseHealthAuditor(this.client);
    this.reportGenerator = new EnhancedReportGenerator();

    // Initialize enterprise features if enabled
    if (options?.enableEnterpriseFeatures) {
      this.enterpriseFeatures = new EnterpriseFeatures(this.client);
      console.log('🚀 Enterprise features enabled');
    }

    // Initialize ML predictor if enabled
    if (options?.enableMLPredictor) {
      this.mlPredictor = new MLPredictor(this.client);
      console.log('🧠 ML predictor enabled');
    }
  }

  /**
   * Perform comprehensive database analysis with all enabled features
   */
  async analyze(): Promise<EnhancedAnalysisResult> {
    const config = this.configManager.getConfig();
    
    try {
      console.log('🔍 Starting comprehensive database analysis...');
      await this.client.connect();
      
      const startTime = Date.now();
      
      // Perform health audit
      const healthReport = await this.auditor.performComprehensiveAudit();
      
      // Initialize enterprise features analysis
      let enterpriseFeatures: any = undefined;
      if (this.enterpriseFeatures) {
        console.log('🏢 Running enterprise features analysis...');
        
        const complianceStatus = await this.enterpriseFeatures.runComplianceAudit();
        const governanceStatus = await this.enterpriseFeatures.getGovernanceStatus();
        const intelligentRecommendations = await this.enterpriseFeatures.generateIntelligentRecommendations();
        
        enterpriseFeatures = {
          complianceStatus,
          governanceStatus,
          intelligentRecommendations
        };
      }

      // Initialize ML insights
      let mlInsights: any = undefined;
      if (this.mlPredictor) {
        console.log('🤖 Running ML analysis...');
        
        // Start data collection if not already running
        await this.mlPredictor.startDataCollection();
        
        // Wait a bit for data collection
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const predictions = await this.mlPredictor.generatePredictions('7d');
        const anomalies = await this.mlPredictor.detectAnomalies();
        const capacityPlanning = await this.mlPredictor.generateCapacityPlanning();
        const queryPatterns = await this.mlPredictor.analyzeQueryPatterns();
        const predictiveMaintenance = await this.mlPredictor.generatePredictiveMaintenance();
        
        mlInsights = {
          predictions,
          anomalies,
          capacityPlanning,
          queryPatterns,
          predictiveMaintenance
        };
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Analysis completed in ${duration}ms`);
      
      // Generate comprehensive summary
      const summary = this.generateEnhancedSummary(healthReport, enterpriseFeatures, mlInsights);
      
      return {
        healthReport,
        enterpriseFeatures,
        mlInsights,
        summary
      };
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      throw error;
    } finally {
      await this.client.end();
    }
  }

  /**
   * Generate enhanced summary including enterprise and ML insights
   */
  private generateEnhancedSummary(
    healthReport: EnhancedDatabaseHealthReport, 
    enterpriseFeatures?: any, 
    mlInsights?: any
  ): AnalysisSummary {
    const baseSummary = this.generateSummary(healthReport);
    
    // Add compliance status if available
    if (enterpriseFeatures?.complianceStatus) {
      baseSummary.complianceStatus = enterpriseFeatures.complianceStatus.overall;
    }
    
    // Add ML insights if available
    if (mlInsights) {
      baseSummary.mlInsights = {
        totalPredictions: mlInsights.predictions?.length || 0,
        totalAnomalies: mlInsights.anomalies?.length || 0,
        criticalAnomalies: mlInsights.anomalies?.filter((a: any) => a.severity === 'critical').length || 0,
        maintenanceRequired: mlInsights.predictiveMaintenance?.filter((m: any) => 
          m.urgency === 'critical' || m.urgency === 'high'
        ).length || 0
      };
    }
    
    return baseSummary;
  }

  /**
   * Generate and save report
   */
  async generateReport(result: EnhancedAnalysisResult, format?: string): Promise<string> {
    const config = this.configManager.getConfig();
    const reportFormat = format || config.reporting?.format || 'html';
    
    try {
      console.log(`📄 Generating ${reportFormat.toUpperCase()} report...`);
      
      let reportPath: string;
      
      switch (reportFormat.toLowerCase()) {
        case 'html':
          reportPath = await this.reportGenerator.generateEnhancedHTMLReport(result.healthReport);
          break;
        case 'json':
          // For JSON, we'll create a simple JSON file
          const jsonContent = JSON.stringify(result, null, 2);
          const jsonPath = join(config.reporting?.outputPath || './reports', `health-report-${Date.now()}.json`);
          await fs.writeFile(jsonPath, jsonContent, 'utf-8');
          reportPath = jsonPath;
          break;
        case 'md':
          // For markdown, we'll create a simple markdown file
          const mdContent = this.generateMarkdownReport(result.healthReport);
          const mdPath = join(config.reporting?.outputPath || './reports', `health-report-${Date.now()}.md`);
          await fs.writeFile(mdPath, mdContent, 'utf-8');
          reportPath = mdPath;
          break;
        case 'cli':
          reportPath = await this.reportGenerator.generateEnhancedCLIReport(result.healthReport);
          break;
        default:
          throw new Error(`Unsupported format: ${reportFormat}`);
      }
      
      console.log(`✅ Report generated: ${reportPath}`);
      return reportPath;
      
    } catch (error) {
      console.error('❌ Report generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate markdown report
   */
  private generateMarkdownReport(report: EnhancedDatabaseHealthReport): string {
    let md = `# Database Health Report\n\n`;
    md += `**Generated:** ${new Date().toISOString()}\n\n`;
    md += `## Summary\n\n`;
    md += `- **Overall Health Score:** ${report.schemaHealth.overall}/10\n`;
    md += `- **Security Issues:** ${report.securityAnalysis.vulnerabilities.length}\n`;
    md += `- **Performance Issues:** ${report.performanceIssues.length}\n`;
    md += `- **Total Issues:** ${report.schemaHealth.issues.length + report.securityAnalysis.vulnerabilities.length}\n\n`;
    
    return md;
  }

  /**
   * Analyze and generate report in one step
   */
  async analyzeAndReport(options?: { 
    returnReport?: boolean; 
    skipSave?: boolean;
    exportSql?: boolean;
    onProgress?: (step: string, progress: number) => void;
  }): Promise<{ 
    reportPath?: string; 
    report?: EnhancedAnalysisResult; 
    summary: AnalysisSummary 
  }> {
    const onProgress = options?.onProgress || (() => {});
    
    onProgress('Starting analysis...', 0);
    
    // Perform analysis
    const report = await this.analyze();
    onProgress('Analysis complete, generating report...', 70);
    
    // Generate summary
    const summary = report.summary;
    onProgress('Summary generated...', 85);
    
    let reportPath: string | undefined;
    
    // Save report unless skipped
    if (!options?.skipSave) {
      reportPath = await this.generateReport(report);
      onProgress('Report saved...', 95);
    }

    // Optionally export aggregated SQL fixes
    if (options?.exportSql) {
      try {
        const fixes = this.collectSqlFixes(report.healthReport);
        const out = this.configManager.getConfig().reporting?.outputPath || './reports';
        await this.ensureDirectoryExists(out);
        const { join } = await import('path');
        const { promises: fsp } = await import('fs');
        const safePath = join(out, `copy-safe.sql`);
        const destructivePath = join(out, `copy-destructive.sql`);
        await fsp.writeFile(safePath, fixes.safe.join('\n') + '\n', 'utf-8');
        await fsp.writeFile(destructivePath, fixes.destructive.join('\n') + '\n', 'utf-8');
      } catch {}
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
      costSavingsPotential: report.costAnalysis.optimizationSavings.monthly.toString(),
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

  private collectSqlFixes(report: EnhancedDatabaseHealthReport): { safe: string[]; destructive: string[] } {
    const safe: string[] = [];
    const destructive: string[] = [];

    // Schema issues fixes
    for (const issue of report.schemaHealth.issues) {
      if (!issue.sqlFix) continue;
      const isDestructive = /drop\s+|vacuum\s+full|reindex|alter\s+table\s+.*\s+drop/i.test(issue.sqlFix);
      (isDestructive ? destructive : safe).push(issue.sqlFix);
    }

    // Index recommendations
    for (const rec of report.indexAnalysis.recommendations || []) {
      if ((rec as any).sql) {
        const sql = (rec as any).sql as string;
        const isDestructive = /drop\s+index/i.test(sql);
        (isDestructive ? destructive : safe).push(sql);
      }
    }

    // Optimization recommendations SQL commands
    for (const rec of report.optimizationRecommendations) {
      if (!rec.sqlCommands) continue;
      for (const cmd of rec.sqlCommands) {
        const isDestructive = /drop\s+|vacuum\s+full|reindex/i.test(cmd);
        (isDestructive ? destructive : safe).push(cmd);
      }
    }

    // Security fixes embedded in vulnerabilities
    for (const v of report.securityAnalysis.vulnerabilities) {
      if (v.solution) {
        const isDestructive = /drop\s+|revoke\s+all/i.test(v.solution);
        (isDestructive ? destructive : safe).push(v.solution);
      }
    }

    // Deduplicate while preserving order
    const dedupe = (arr: string[]) => Array.from(new Set(arr.map(s => s.trim()))).filter(Boolean);
    return { safe: dedupe(safe), destructive: dedupe(destructive) };
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

// Export for NPM package
export default EnhancedSQLAnalyzer;
export { ConfigManager, configPresets, type SqlAnalyzerConfig };