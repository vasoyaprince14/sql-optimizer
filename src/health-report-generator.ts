import chalk from 'chalk';
import { DatabaseHealthReport } from './database-health-auditor';

export class HealthReportGenerator {
  /**
   * Generate a comprehensive CLI health report
   */
  generateCLIReport(report: DatabaseHealthReport): string {
    let output = '';

    output += this.generateHeader();
    output += this.generateDatabaseInfoSection(report);
    output += this.generateSchemaHealthSection(report);
    output += this.generateIndexAnalysisSection(report);
    output += this.generatePerformanceSection(report);
    output += this.generateSecuritySection(report);
    output += this.generateCostAnalysisSection(report);
    output += this.generateRecommendationsSection(report);
    output += this.generateMaintenanceSection(report);
    output += this.generateSummarySection(report);

    return output;
  }

  /**
   * Generate JSON report
   */
  generateJSONReport(report: DatabaseHealthReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(report: DatabaseHealthReport): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Health Audit Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6; 
            color: #333; 
            background: #f8f9fa;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            padding: 40px 30px; 
            border-radius: 12px 12px 0 0;
            text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 1.1em; }
        
        .content { padding: 30px; }
        .section { 
            margin-bottom: 40px; 
            padding: 25px; 
            border: 1px solid #e9ecef; 
            border-radius: 8px; 
            background: #fff;
        }
        .section h2 { 
            color: #495057; 
            margin-bottom: 20px; 
            padding-bottom: 10px; 
            border-bottom: 2px solid #e9ecef;
            font-size: 1.5em;
        }
        
        .score-container { text-align: center; padding: 20px; }
        .score { 
            font-size: 4em; 
            font-weight: bold; 
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
        .score.excellent { color: #28a745; }
        .score.good { color: #ffc107; }
        .score.poor { color: #dc3545; }
        
        .metrics-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin: 20px 0;
        }
        .metric-card { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            text-align: center;
            border-left: 4px solid #667eea;
        }
        .metric-value { font-size: 1.8em; font-weight: bold; color: #495057; }
        .metric-label { color: #6c757d; margin-top: 5px; }
        
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        th, td { 
            padding: 12px 15px; 
            text-align: left; 
            border-bottom: 1px solid #e9ecef;
        }
        th { 
            background: #495057; 
            color: white; 
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.85em;
            letter-spacing: 0.5px;
        }
        tr:hover { background: #f8f9fa; }
        
        .issue { 
            margin: 15px 0; 
            padding: 15px; 
            border-radius: 8px; 
            border-left: 4px solid;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .issue.critical { 
            background: #f8d7da; 
            border-left-color: #dc3545; 
            color: #721c24;
        }
        .issue.high { 
            background: #fff3cd; 
            border-left-color: #ffc107; 
            color: #856404;
        }
        .issue.medium { 
            background: #d1ecf1; 
            border-left-color: #17a2b8; 
            color: #0c5460;
        }
        .issue.low { 
            background: #d4edda; 
            border-left-color: #28a745; 
            color: #155724;
        }
        
        .severity-badge { 
            display: inline-block; 
            padding: 4px 8px; 
            border-radius: 12px; 
            font-size: 0.75em; 
            font-weight: bold; 
            text-transform: uppercase; 
            margin-bottom: 8px;
        }
        .severity-critical { background: #dc3545; color: white; }
        .severity-high { background: #fd7e14; color: white; }
        .severity-medium { background: #ffc107; color: #000; }
        .severity-low { background: #28a745; color: white; }
        
        .recommendation { 
            margin: 15px 0; 
            padding: 20px; 
            background: linear-gradient(45deg, #e7f3ff, #f0f8ff); 
            border-radius: 8px;
            border-left: 4px solid #007bff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .recommendation h4 { 
            color: #0056b3; 
            margin-bottom: 10px; 
            font-size: 1.2em;
        }
        .recommendation p { margin: 8px 0; }
        .recommendation strong { color: #495057; }
        
        .sql-code { 
            background: #2d3748; 
            color: #e2e8f0; 
            padding: 12px 15px; 
            border-radius: 6px; 
            font-family: 'Monaco', 'Consolas', monospace; 
            font-size: 0.9em; 
            margin: 10px 0;
            overflow-x: auto;
            white-space: pre-wrap;
        }
        
        .summary-stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
            gap: 15px; 
            margin: 20px 0;
        }
        .stat-item { 
            text-align: center; 
            padding: 15px; 
            background: #f8f9fa; 
            border-radius: 8px;
        }
        .stat-number { 
            font-size: 2em; 
            font-weight: bold; 
            color: #495057;
        }
        .stat-label { 
            color: #6c757d; 
            font-size: 0.9em; 
            margin-top: 5px;
        }
        
        .index-list { 
            max-height: 400px; 
            overflow-y: auto; 
            border: 1px solid #e9ecef; 
            border-radius: 6px; 
            padding: 15px;
        }
        .index-item { 
            padding: 8px 12px; 
            margin: 5px 0; 
            background: #f8f9fa; 
            border-radius: 4px; 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
        }
        .index-name { font-weight: 600; color: #495057; }
        .index-size { color: #6c757d; font-size: 0.9em; }
        
        .footer { 
            text-align: center; 
            padding: 20px; 
            color: #6c757d; 
            border-top: 1px solid #e9ecef; 
            margin-top: 30px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 Database Health Audit Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p>Database Version: ${this.escapeHtml(report.databaseInfo.version.split(' ')[0])}</p>
        </div>

        <div class="content">
            <div class="section">
                <h2>📊 Overall Health Score</h2>
                <div class="score-container">
                    <div class="score ${this.getScoreClass(report.schemaHealth.overall)}">${report.schemaHealth.overall}/10</div>
                    <p>${this.getScoreDescription(report.schemaHealth.overall)}</p>
                </div>
            </div>

            <div class="section">
                <h2>🗂️ Database Overview</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">${report.databaseInfo.size}</div>
                        <div class="metric-label">Database Size</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${report.databaseInfo.tableCount}</div>
                        <div class="metric-label">Tables</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${report.databaseInfo.indexCount}</div>
                        <div class="metric-label">Indexes</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${report.databaseInfo.connectionInfo.activeConnections}/${report.databaseInfo.connectionInfo.maxConnections}</div>
                        <div class="metric-label">Connections</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>🏗️ Schema Health Breakdown</h2>
                <div class="summary-stats">
                    <div class="stat-item">
                        <div class="stat-number">${report.schemaHealth.normalization}/10</div>
                        <div class="stat-label">Normalization</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${report.schemaHealth.indexEfficiency}/10</div>
                        <div class="stat-label">Index Efficiency</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${report.schemaHealth.foreignKeyIntegrity}/10</div>
                        <div class="stat-label">FK Integrity</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${report.schemaHealth.dataTypes}/10</div>
                        <div class="stat-label">Data Types</div>
                    </div>
                </div>
            </div>

            ${report.schemaHealth.issues.length > 0 ? `
            <div class="section">
                <h2>⚠️ Issues Found (${report.schemaHealth.issues.length})</h2>
                ${report.schemaHealth.issues.map(issue => `
                    <div class="issue ${issue.severity}">
                        <span class="severity-badge severity-${issue.severity}">${issue.severity}</span>
                        <strong>${this.escapeHtml(issue.description)}</strong><br>
                        <em>💡 ${this.escapeHtml(issue.suggestion)}</em>
                        ${issue.sqlFix ? `<div class="sql-code">${this.escapeHtml(issue.sqlFix)}</div>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}

            ${report.indexAnalysis.unusedIndexes.length > 0 ? `
            <div class="section">
                <h2>🗑️ Unused Indexes (${report.indexAnalysis.unusedIndexes.length})</h2>
                <div class="index-list">
                    ${report.indexAnalysis.unusedIndexes.map(index => `
                        <div class="index-item">
                            <span class="index-name">${this.escapeHtml(index.name)}</span>
                            <span class="index-size">${index.size} on ${this.escapeHtml(index.table)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${report.optimizationRecommendations.length > 0 ? `
            <div class="section">
                <h2>💡 Optimization Recommendations</h2>
                ${report.optimizationRecommendations.map((rec, index) => `
                    <div class="recommendation">
                        <h4>${index + 1}. ${this.escapeHtml(rec.title)} 
                            <span class="severity-badge severity-${rec.priority}">${rec.priority}</span>
                        </h4>
                        <p><strong>Description:</strong> ${this.escapeHtml(rec.description)}</p>
                        <p><strong>Impact:</strong> ${this.escapeHtml(rec.estimatedImpact)}</p>
                        <p><strong>Implementation:</strong> ${this.escapeHtml(rec.implementation)}</p>
                        ${rec.sqlCommands && rec.sqlCommands.length > 0 ? `
                            <strong>SQL Commands:</strong>
                            <div class="sql-code">${rec.sqlCommands.map(cmd => this.escapeHtml(cmd)).join('\n')}</div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}

            <div class="section">
                <h2>📋 Summary</h2>
                <div class="summary-stats">
                    <div class="stat-item">
                        <div class="stat-number">${report.schemaHealth.overall}/10</div>
                        <div class="stat-label">Health Score</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${report.schemaHealth.issues.length + report.performanceIssues.length + report.securityIssues.length}</div>
                        <div class="stat-label">Issues Found</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${report.optimizationRecommendations.length}</div>
                        <div class="stat-label">Recommendations</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">$${(report.costAnalysis.estimatedCosts.storage + report.costAnalysis.estimatedCosts.compute + report.costAnalysis.estimatedCosts.maintenance).toFixed(0)}</div>
                        <div class="stat-label">Monthly Cost</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Generated by SQL Optimizer v1.0 • ${new Date().toISOString()}</p>
        </div>
    </div>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private getScoreDescription(score: number): string {
    if (score >= 8) return 'Excellent - Your database is in great health!';
    if (score >= 6) return 'Good - Minor optimizations recommended';
    if (score >= 4) return 'Fair - Several improvements needed';
    return 'Poor - Immediate attention required';
  }

  private generateHeader(): string {
    return `
🏥 ${chalk.blue.bold('DATABASE HEALTH AUDIT REPORT')}
═══════════════════════════════════════════════════════════════

`;
  }

  private generateDatabaseInfoSection(report: DatabaseHealthReport): string {
    const { databaseInfo } = report;
    
    return `
🗂️  ${chalk.bold('DATABASE INFORMATION')}
────────────────────────────────────────────────────────────────

📊 Database Size: ${chalk.cyan(databaseInfo.size)}
📋 Tables: ${chalk.yellow(databaseInfo.tableCount)}
📈 Indexes: ${chalk.yellow(databaseInfo.indexCount)}
🔗 Connections: ${chalk.green(databaseInfo.connectionInfo.activeConnections)}/${databaseInfo.connectionInfo.maxConnections}

⚙️  Configuration:
  • Shared Buffers: ${databaseInfo.settings.sharedBuffers}
  • Effective Cache Size: ${databaseInfo.settings.effectiveCacheSize}
  • Work Memory: ${databaseInfo.settings.workMem}
  • Maintenance Work Memory: ${databaseInfo.settings.maintenanceWorkMem}

`;
  }

  private generateSchemaHealthSection(report: DatabaseHealthReport): string {
    const { schemaHealth } = report;
    const overallColor = this.getScoreColor(schemaHealth.overall);
    
    let section = `
🏗️  ${chalk.bold('SCHEMA HEALTH ANALYSIS')}
────────────────────────────────────────────────────────────────

📊 Overall Health Score: ${overallColor(schemaHealth.overall + '/10')}

🔍 Component Scores:
  • Normalization: ${this.getScoreColor(schemaHealth.normalization)(schemaHealth.normalization + '/10')}
  • Index Efficiency: ${this.getScoreColor(schemaHealth.indexEfficiency)(schemaHealth.indexEfficiency + '/10')}
  • Foreign Key Integrity: ${this.getScoreColor(schemaHealth.foreignKeyIntegrity)(schemaHealth.foreignKeyIntegrity + '/10')}
  • Data Types: ${this.getScoreColor(schemaHealth.dataTypes)(schemaHealth.dataTypes + '/10')}
  • Naming: ${this.getScoreColor(schemaHealth.naming)(schemaHealth.naming + '/10')}

`;

    if (schemaHealth.issues.length > 0) {
      section += `⚠️  ${chalk.bold('SCHEMA ISSUES FOUND:')}\n`;
      schemaHealth.issues.forEach(issue => {
        const severityColor = this.getSeverityColor(issue.severity);
        section += `
  ${severityColor('●')} ${severityColor(issue.severity.toUpperCase())} - ${issue.description}
    💡 ${issue.suggestion}`;
        if (issue.sqlFix) {
          section += `\n    🔧 ${chalk.gray(issue.sqlFix)}`;
        }
        section += '\n';
      });
    }

    return section + '\n';
  }

  private generateIndexAnalysisSection(report: DatabaseHealthReport): string {
    const { indexAnalysis } = report;
    
    let section = `
📈 ${chalk.bold('INDEX ANALYSIS')}
────────────────────────────────────────────────────────────────

📊 Total Indexes: ${chalk.yellow(indexAnalysis.totalIndexes)}
⚡ Index Efficiency Score: ${this.getScoreColor(indexAnalysis.indexEfficiencyScore)(indexAnalysis.indexEfficiencyScore + '/10')}

`;

    if (indexAnalysis.unusedIndexes.length > 0) {
      section += `🗑️  ${chalk.bold('UNUSED INDEXES:')}\n`;
      indexAnalysis.unusedIndexes.forEach(index => {
        section += `  • ${chalk.red(index.name)} on ${index.table} (${index.size})\n`;
      });
      section += '\n';
    }

    if (indexAnalysis.missingIndexes.length > 0) {
      section += `❌ ${chalk.bold('MISSING INDEXES:')}\n`;
      indexAnalysis.missingIndexes.forEach(missing => {
        section += `  • ${missing.table}.${missing.columns.join(', ')} - ${missing.reason}\n`;
        section += `    💡 ${chalk.gray(missing.suggestedSql)}\n`;
      });
      section += '\n';
    }

    return section;
  }

  private generatePerformanceSection(report: DatabaseHealthReport): string {
    const { performanceIssues } = report;
    
    if (performanceIssues.length === 0) {
      return `
⚡ ${chalk.bold('PERFORMANCE ANALYSIS')}
────────────────────────────────────────────────────────────────

${chalk.green('✅ No critical performance issues detected!')}

`;
    }

    let section = `
⚡ ${chalk.bold('PERFORMANCE ANALYSIS')}
────────────────────────────────────────────────────────────────

🚨 ${chalk.bold('PERFORMANCE ISSUES:')}\n`;

    performanceIssues.forEach(issue => {
      const severityColor = this.getSeverityColor(issue.severity);
      section += `
  ${severityColor('●')} ${severityColor(issue.severity.toUpperCase())} - ${issue.description}
    📊 Impact: ${issue.impact}
    💡 Solution: ${issue.solution}`;
      if (issue.sqlFix) {
        section += `\n    🔧 ${chalk.gray(issue.sqlFix)}`;
      }
      section += '\n';
    });

    return section + '\n';
  }

  private generateSecuritySection(report: DatabaseHealthReport): string {
    const { securityIssues } = report;
    
    if (securityIssues.length === 0) {
      return `
🔒 ${chalk.bold('SECURITY ANALYSIS')}
────────────────────────────────────────────────────────────────

${chalk.green('✅ No critical security issues detected!')}

`;
    }

    let section = `
🔒 ${chalk.bold('SECURITY ANALYSIS')}
────────────────────────────────────────────────────────────────

🚨 ${chalk.bold('SECURITY ISSUES:')}\n`;

    securityIssues.forEach(issue => {
      const severityColor = this.getSeverityColor(issue.severity);
      section += `
  ${severityColor('●')} ${severityColor(issue.severity.toUpperCase())} - ${issue.description}
    💡 ${issue.recommendation}\n`;
    });

    return section + '\n';
  }

  private generateCostAnalysisSection(report: DatabaseHealthReport): string {
    const { costAnalysis } = report;
    
    return `
💰 ${chalk.bold('COST ANALYSIS')}
────────────────────────────────────────────────────────────────

📊 Storage Usage:
  • Total Size: ${chalk.cyan(costAnalysis.storageUsage.totalSize)}
  • Data Size: ${chalk.cyan(costAnalysis.storageUsage.dataSize)}
  • Index Size: ${chalk.cyan(costAnalysis.storageUsage.indexSize)}
  • Wasted Space: ${chalk.red(costAnalysis.storageUsage.wastedSpace)}

💵 Estimated Monthly Costs:
  • Storage: $${costAnalysis.estimatedCosts.storage.toFixed(2)}
  • Compute: $${costAnalysis.estimatedCosts.compute.toFixed(2)}
  • Maintenance: $${costAnalysis.estimatedCosts.maintenance.toFixed(2)}
  • Total: $${(costAnalysis.estimatedCosts.storage + costAnalysis.estimatedCosts.compute + costAnalysis.estimatedCosts.maintenance).toFixed(2)}

`;
  }

  private generateRecommendationsSection(report: DatabaseHealthReport): string {
    const { optimizationRecommendations } = report;
    
    if (optimizationRecommendations.length === 0) {
      return `
💡 ${chalk.bold('OPTIMIZATION RECOMMENDATIONS')}
────────────────────────────────────────────────────────────────

${chalk.green('✅ No optimization recommendations at this time!')}

`;
    }

    let section = `
💡 ${chalk.bold('OPTIMIZATION RECOMMENDATIONS')}
────────────────────────────────────────────────────────────────

`;

    optimizationRecommendations.forEach((rec, index) => {
      const priorityColor = this.getPriorityColor(rec.priority);
      section += `
${index + 1}. ${chalk.bold(rec.title)} [${priorityColor(rec.priority.toUpperCase())}]
   📝 ${rec.description}
   📊 Impact: ${rec.estimatedImpact}
   🛠️  Implementation: ${rec.implementation}`;
      
      if (rec.sqlCommands && rec.sqlCommands.length > 0) {
        section += '\n   🔧 SQL Commands:';
        rec.sqlCommands.forEach(cmd => {
          section += `\n      ${chalk.gray(cmd)}`;
        });
      }
      section += '\n';
    });

    return section + '\n';
  }

  private generateMaintenanceSection(report: DatabaseHealthReport): string {
    const { maintenanceRecommendations } = report;
    
    let section = `
🔧 ${chalk.bold('MAINTENANCE SCHEDULE')}
────────────────────────────────────────────────────────────────

`;

    maintenanceRecommendations.forEach(maintenance => {
      const importanceColor = this.getSeverityColor(maintenance.importance);
      section += `
${importanceColor('●')} ${chalk.bold(maintenance.task)} [${maintenance.frequency.toUpperCase()}]
   📝 ${maintenance.description}`;
      if (maintenance.command) {
        section += `\n   🔧 ${chalk.gray(maintenance.command)}`;
      }
      section += '\n';
    });

    return section + '\n';
  }

  private generateSummarySection(report: DatabaseHealthReport): string {
    const issueCount = report.schemaHealth.issues.length + report.performanceIssues.length + report.securityIssues.length;
    const recommendationCount = report.optimizationRecommendations.length;
    
    return `
📋 ${chalk.bold('AUDIT SUMMARY')}
────────────────────────────────────────────────────────────────

📊 Overall Health Score: ${this.getScoreColor(report.schemaHealth.overall)(report.schemaHealth.overall + '/10')}
⚠️  Issues Found: ${issueCount > 0 ? chalk.red(issueCount) : chalk.green('0')}
💡 Recommendations: ${recommendationCount > 0 ? chalk.yellow(recommendationCount) : chalk.green('0')}
💰 Estimated Monthly Cost: $${(report.costAnalysis.estimatedCosts.storage + report.costAnalysis.estimatedCosts.compute + report.costAnalysis.estimatedCosts.maintenance).toFixed(2)}

${issueCount === 0 ? 
  chalk.green('🎉 Your database is in excellent health!') : 
  chalk.yellow('⚡ Consider implementing the recommendations above to improve database health.')
}

────────────────────────────────────────────────────────────────
Report generated by SQL Optimizer v1.0
${new Date().toISOString()}
`;
  }

  private getScoreColor(score: number) {
    if (score >= 8) return chalk.green;
    if (score >= 6) return chalk.yellow;
    return chalk.red;
  }

  private getScoreClass(score: number): string {
    if (score >= 8) return 'excellent';
    if (score >= 6) return 'good';
    return 'poor';
  }

  private getSeverityColor(severity: string) {
    switch (severity) {
      case 'critical': return chalk.red.bold;
      case 'high': return chalk.red;
      case 'medium': return chalk.yellow;
      case 'low': return chalk.blue;
      default: return chalk.gray;
    }
  }

  private getPriorityColor(priority: string) {
    switch (priority) {
      case 'critical': return chalk.red.bold;
      case 'high': return chalk.red;
      case 'medium': return chalk.yellow;
      case 'low': return chalk.blue;
      default: return chalk.gray;
    }
  }
}