import chalk from 'chalk';
import { AnalysisResult, BatchAnalysisResult, ReportOptions, SchemaAnalysis } from './types';

export class Reporter {
  /**
   * Generate a report based on analysis results
   */
  async generateReport(
    result: AnalysisResult | BatchAnalysisResult | SchemaAnalysis,
    options: ReportOptions = { format: 'cli' }
  ): Promise<string> {
    switch (options.format) {
      case 'cli':
        return this.generateCLIReport(result);
      case 'json':
        return this.generateJSONReport(result);
      case 'html':
        return this.generateHTMLReport(result);
      default:
        return this.generateCLIReport(result);
    }
  }

  /**
   * Generate CLI report
   */
  private generateCLIReport(result: any): string {
    if (this.isBatchResult(result)) {
      return this.generateBatchCLIReport(result);
    } else if (this.isSchemaAnalysis(result)) {
      return this.generateSchemaCLIReport(result);
    } else {
      return this.generateSingleQueryCLIReport(result);
    }
  }

  /**
   * Generate CLI report for single query analysis
   */
  private generateSingleQueryCLIReport(result: AnalysisResult): string {
    const { query, performance, issues, suggestions, aiRecommendations } = result;
    
    let report = '';
    
    // Header
    report += chalk.blue('\n🔍 SQL Optimizer Analysis Report\n');
    report += chalk.gray('═══════════════════════════════════════════════════════════════\n\n');
    
    // Query
    report += chalk.white('📝 Query:\n');
    report += chalk.gray(query) + '\n\n';
    
    // Performance Metrics
    report += chalk.blue('📊 Performance Metrics:\n');
    report += chalk.white(`  • Execution Time: ${performance.executionTime}ms\n`);
    report += chalk.white(`  • Rows Returned: ${performance.rowsReturned.toLocaleString()}\n`);
    report += chalk.white(`  • Buffer Usage: ${performance.bufferUsage}\n`);
    report += chalk.white(`  • Cache Hit Ratio: ${performance.cacheHitRatio}%\n`);
    if (performance.planningTime) {
      report += chalk.white(`  • Planning Time: ${performance.planningTime}ms\n`);
    }
    report += '\n';
    
    // Issues
    if (issues.length > 0) {
      report += chalk.red('⚠️  Performance Issues:\n');
      issues.forEach(issue => {
        const severityColor = this.getSeverityColor(issue.severity);
        report += severityColor(`  • ${issue.message}\n`);
        if (issue.suggestion) {
          report += chalk.gray(`    Suggestion: ${issue.suggestion}\n`);
        }
      });
      report += '\n';
    }
    
    // Suggestions
    if (suggestions.length > 0) {
      report += chalk.green('💡 Suggestions:\n');
      suggestions.forEach(suggestion => {
        const priorityColor = this.getPriorityColor(suggestion.priority);
        report += priorityColor(`  • ${suggestion.title}\n`);
        report += chalk.gray(`    ${suggestion.description}\n`);
        if (suggestion.sql) {
          report += chalk.cyan(`    SQL: ${suggestion.sql}\n`);
        }
      });
      report += '\n';
    }
    
    // AI Recommendations
    if (aiRecommendations && aiRecommendations.length > 0) {
      report += chalk.magenta('🧠 AI Recommendations:\n');
      aiRecommendations.forEach(rec => {
        report += chalk.magenta(`  • ${rec.title}\n`);
        report += chalk.gray(`    ${rec.description}\n`);
        if (rec.reasoning) {
          report += chalk.gray(`    Reasoning: ${rec.reasoning}\n`);
        }
        if (rec.implementation) {
          report += chalk.cyan(`    Implementation: ${rec.implementation}\n`);
        }
      });
      report += '\n';
    }
    
    // Summary
    report += chalk.blue('📈 Summary:\n');
    const hasIssues = issues.length > 0;
    const hasSuggestions = suggestions.length > 0;
    
    if (hasIssues) {
      report += chalk.red(`  • ${issues.length} performance issues detected\n`);
    }
    if (hasSuggestions) {
      report += chalk.green(`  • ${suggestions.length} optimization suggestions\n`);
    }
    if (aiRecommendations && aiRecommendations.length > 0) {
      report += chalk.magenta(`  • ${aiRecommendations.length} AI-powered recommendations\n`);
    }
    
    return report;
  }

  /**
   * Generate CLI report for batch analysis
   */
  private generateBatchCLIReport(result: BatchAnalysisResult): string {
    let report = '';
    
    // Header
    report += chalk.blue('\n🔍 SQL Optimizer Batch Analysis Report\n');
    report += chalk.gray('═══════════════════════════════════════════════════════════════\n\n');
    
    // Summary
    const { summary, recommendations } = result;
    report += chalk.blue('📊 Batch Summary:\n');
    report += chalk.white(`  • Total Queries: ${summary.totalQueries}\n`);
    report += chalk.yellow(`  • Slow Queries: ${summary.slowQueries}\n`);
    report += chalk.red(`  • Issues Found: ${summary.issuesFound}\n`);
    report += chalk.green(`  • Suggestions Generated: ${summary.suggestionsGenerated}\n`);
    report += chalk.cyan(`  • Average Execution Time: ${summary.averageExecutionTime.toFixed(2)}ms\n\n`);
    
    // Recommendations Summary
    report += chalk.blue('💡 Recommendations Summary:\n');
    report += chalk.green(`  • Index Suggestions: ${recommendations.indexes.length}\n`);
    report += chalk.blue(`  • Query Rewrites: ${recommendations.queryRewrites.length}\n`);
    report += chalk.magenta(`  • Schema Changes: ${recommendations.schemaChanges.length}\n\n`);
    
    // Individual Query Results
    report += chalk.blue('📝 Individual Query Results:\n');
    result.queries.forEach((queryResult, index) => {
      report += chalk.white(`\n${index + 1}. Query ${index + 1}:\n`);
      report += chalk.gray(`   Execution Time: ${queryResult.performance.executionTime}ms\n`);
      report += chalk.gray(`   Issues: ${queryResult.issues.length}\n`);
      report += chalk.gray(`   Suggestions: ${queryResult.suggestions.length}\n`);
    });
    
    return report;
  }

  /**
   * Generate CLI report for schema analysis
   */
  private generateSchemaCLIReport(result: SchemaAnalysis): string {
    let report = '';
    
    // Header
    report += chalk.blue('\n🔍 SQL Optimizer Schema Analysis Report\n');
    report += chalk.gray('═══════════════════════════════════════════════════════════════\n\n');
    
    // Tables
    report += chalk.blue('📋 Tables:\n');
    result.tables.forEach(table => {
      report += chalk.white(`  • ${table.name}\n`);
      report += chalk.gray(`    Columns: ${table.columns.length}\n`);
      report += chalk.gray(`    Indexes: ${table.indexes.length}\n`);
      if (table.rowCount) {
        report += chalk.gray(`    Rows: ${table.rowCount.toLocaleString()}\n`);
      }
      if (table.size) {
        report += chalk.gray(`    Size: ${table.size}\n`);
      }
    });
    report += '\n';
    
    // Relationships
    if (result.relationships.length > 0) {
      report += chalk.blue('🔗 Relationships:\n');
      result.relationships.forEach(rel => {
        report += chalk.white(`  • ${rel.fromTable}.${rel.fromColumn} → ${rel.toTable}.${rel.toColumn} (${rel.type})\n`);
      });
      report += '\n';
    }
    
    // Recommendations
    if (result.recommendations.length > 0) {
      report += chalk.blue('💡 Schema Recommendations:\n');
      result.recommendations.forEach(rec => {
        const priorityColor = this.getPriorityColor(rec.priority);
        report += priorityColor(`  • ${rec.title}\n`);
        report += chalk.gray(`    ${rec.description}\n`);
        if (rec.sql) {
          report += chalk.cyan(`    SQL: ${rec.sql}\n`);
        }
      });
      report += '\n';
    }
    
    // Scores
    report += chalk.blue('📈 Schema Scores:\n');
    report += chalk.white(`  • Normalization Score: ${result.normalizationScore}/10\n`);
    report += chalk.white(`  • Performance Score: ${result.performanceScore}/10\n`);
    
    return report;
  }

  /**
   * Generate JSON report
   */
  private generateJSONReport(result: any): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * Generate HTML report
   */
  private generateHTMLReport(result: any): string {
    // This is a simplified HTML report
    // In a real implementation, you'd want a more sophisticated template
    return `
<!DOCTYPE html>
<html>
<head>
    <title>SQL Optimizer Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #007bff; color: white; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f8f9fa; border-radius: 3px; }
        .issue { color: #dc3545; }
        .suggestion { color: #28a745; }
        .ai { color: #6f42c1; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 SQL Optimizer Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="section">
        <h2>Query</h2>
        <pre>${result.query || 'N/A'}</pre>
    </div>
    
    <div class="section">
        <h2>Performance Metrics</h2>
        <div class="metric">Execution Time: ${result.performance?.executionTime || 0}ms</div>
        <div class="metric">Rows Returned: ${result.performance?.rowsReturned || 0}</div>
        <div class="metric">Buffer Usage: ${result.performance?.bufferUsage || 'N/A'}</div>
        <div class="metric">Cache Hit Ratio: ${result.performance?.cacheHitRatio || 0}%</div>
    </div>
    
    <div class="section">
        <h2>Issues</h2>
        ${result.issues?.map((issue: any) => `<div class="issue">• ${issue.message}</div>`).join('') || 'No issues found'}
    </div>
    
    <div class="section">
        <h2>Suggestions</h2>
        ${result.suggestions?.map((suggestion: any) => `<div class="suggestion">• ${suggestion.title}: ${suggestion.description}</div>`).join('') || 'No suggestions'}
    </div>
    
    <div class="section">
        <h2>AI Recommendations</h2>
        ${result.aiRecommendations?.map((rec: any) => `<div class="ai">• ${rec.title}: ${rec.description}</div>`).join('') || 'No AI recommendations'}
    </div>
</body>
</html>`;
  }

  /**
   * Type guards
   */
  private isBatchResult(result: any): result is BatchAnalysisResult {
    return 'summary' in result && 'queries' in result;
  }

  private isSchemaAnalysis(result: any): result is SchemaAnalysis {
    return 'tables' in result && 'relationships' in result;
  }

  /**
   * Color helpers
   */
  private getSeverityColor(severity: string): (text: string) => string {
    switch (severity) {
      case 'critical': return chalk.red;
      case 'high': return chalk.red;
      case 'medium': return chalk.yellow;
      case 'low': return chalk.gray;
      default: return chalk.white;
    }
  }

  private getPriorityColor(priority: string): (text: string) => string {
    switch (priority) {
      case 'high': return chalk.red;
      case 'medium': return chalk.yellow;
      case 'low': return chalk.gray;
      default: return chalk.white;
    }
  }
} 