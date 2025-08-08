import chalk from 'chalk';
import { EnhancedDatabaseHealthReport, TableBloatInfo, SecurityVulnerability, OptimizationRecommendation } from './enhanced-database-auditor';

export class EnhancedReportGenerator {
  private getQuickFixes(report: EnhancedDatabaseHealthReport): Array<{severity: 'critical'|'high'|'medium'|'low', title: string, description: string, sql?: string}> {
    const fixes: Array<{severity: 'critical'|'high'|'medium'|'low', title: string, description: string, sql?: string}> = [];
    // Security first
    report.securityAnalysis.vulnerabilities.forEach(v => {
      const sev: any = v.severity;
      fixes.push({ severity: sev, title: v.description, description: v.impact, sql: v.solution.includes('ALTER') || v.solution.includes('REVOKE') ? v.solution : undefined });
    });
    // Missing FK indexes
    report.schemaHealth.issues.filter(i => i.type === 'missing_fk_index').forEach(i => {
      fixes.push({ severity: 'high', title: `Index FK ${i.table}.${i.column}`, description: i.suggestion, sql: i.sqlFix });
    });
    // Missing PKs
    report.schemaHealth.issues.filter(i => i.type === 'missing_pk').forEach(i => {
      fixes.push({ severity: 'critical', title: `Add PK to ${i.table}`, description: i.suggestion, sql: i.sqlFix });
    });
    // Bloat quick action
    report.tableAnalysis.tablesWithBloat.slice(0,5).forEach(t => {
      fixes.push({ severity: 'medium', title: `Repack/VACUUM ${t.tableName}`, description: `Reclaim ${t.wastedSpace}`, sql: `VACUUM (FULL, ANALYZE) ${t.tableName};` });
    });
    return fixes;
  }

  private collectSqlFixes(report: EnhancedDatabaseHealthReport): string[] {
    const sqls: string[] = [];
    report.schemaHealth.issues.forEach(i => { if (i.sqlFix) sqls.push(i.sqlFix); });
    report.indexAnalysis.unusedIndexes.forEach(u => sqls.push(`DROP INDEX IF EXISTS ${u.name};`));
    report.optimizationRecommendations.forEach(r => (r.sqlCommands||[]).forEach(s => sqls.push(s)));
    report.tableAnalysis.tablesWithBloat.forEach(t => sqls.push(`VACUUM (FULL, ANALYZE) ${t.tableName};`));
    report.securityAnalysis.vulnerabilities.forEach(v => { if (v.solution?.match(/ALTER|REVOKE/)) sqls.push(v.solution); });
    return Array.from(new Set(sqls));
  }

  private getStrategicRecommendations(report: EnhancedDatabaseHealthReport): string[] {
    const recs: string[] = [];
    // Partitioning suggestion for very large tables
    const large = report.tableAnalysis.largeTables.filter(t => {
      const num = parseFloat(String(t.size).replace(/[^0-9.]/g, ''));
      return (t.size.includes('GB') && num >= 5) || (t.size.includes('TB'));
    });
    if (large.length > 0) {
      recs.push(`Partition ${large.length} large table(s) by time/tenant to reduce bloat and speed maintenance.`);
    }
    // Connection pooling and locks
    if ((report.databaseInfo.connectionInfo.activeConnections / Math.max(report.databaseInfo.connectionInfo.maxConnections,1)) > 0.7) {
      recs.push('Introduce PgBouncer and keep transactions short to reduce lock contention.');
    }
    // Index strategy
    if (report.indexAnalysis.missingIndexes.length > 0) {
      recs.push('Define an indexing policy: always index FKs and frequent filter columns; audit quarterly.');
    }
    // Security hardening
    const rlsMissing = report.securityAnalysis.vulnerabilities.filter(v => v.type === 'rls_disabled');
    if (rlsMissing.length > 0) {
      recs.push('Adopt tenant/user isolation with RLS and role-based grants; avoid PUBLIC privileges.');
    }
    // Maintenance automation
    if (report.tableAnalysis.tablesWithBloat.length > 0) {
      recs.push('Automate VACUUM/ANALYZE and schedule pg_repack for bloat-heavy tables.');
    }
    return recs;
  }

  private sanitizeAIText(input: unknown): string {
    if (input == null) return '';
    let text = String(input);
    // Strip fenced code blocks like ```json ... ``` and keep inner content
    text = text.replace(/```[a-zA-Z]*\n([\s\S]*?)```/g, '$1');
    // Remove stray backticks
    text = text.replace(/```/g, '');
    // Collapse excessive whitespace
    text = text.replace(/\s+\n/g, '\n').trim();
    return text;
  }

  private normalizeToArray(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map(v => this.sanitizeAIText(v)).filter(Boolean);
    }
    const text = this.sanitizeAIText(value);
    const lines = text
      .split(/\r?\n|\u2022|\-|\d+\.\s/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    return lines.length ? lines : [text];
  }

  private generateTOC(report: EnhancedDatabaseHealthReport, isAI: boolean): string {
    const items = [
      { id: 'tldr', label: 'TL;DR' },
      ...(isAI ? [{ id: 'ai-exec', label: 'AI Executive Summary' }] : []),
      { id: 'schema', label: 'Schema' },
      { id: 'tables', label: 'Tables' },
      { id: 'security', label: 'Security' },
      { id: 'performance', label: 'Performance' },
      { id: 'optimization', label: 'Optimization' },
      { id: 'queries', label: 'Queries' },
      { id: 'config', label: 'Configuration' },
      { id: 'maintenance', label: 'Maintenance' },
      { id: 'cost', label: 'Cost' },
      ...(report.aiInsights ? [{ id: 'ai', label: 'AI Insights (Details)' }] : []),
      { id: 'trends', label: 'Trends' },
    ];
    return `
    <nav class="toc" style="display:flex; flex-wrap:wrap; gap:10px; margin: 20px 0 10px;">
      ${items.map(i => `<a href="#${i.id}" class="export-btn" style="padding:8px 14px; font-size: 0.9em;">${i.label}</a>`).join('')}
    </nav>`;
  }

  private generateTLDR(report: EnhancedDatabaseHealthReport, quickFixes: Array<{severity: 'critical'|'high'|'medium'|'low', title: string, description: string, sql?: string}>): string {
    const criticalSec = report.securityAnalysis.vulnerabilities.filter(v => v.severity === 'critical').length;
    const bloatCount = report.tableAnalysis.tablesWithBloat.length;
    const missingIdx = report.indexAnalysis.missingIndexes.length;
    const savings = report.costAnalysis.optimizationSavings.monthly.toFixed(0);
    return `
    <a id="tldr"></a>
    <div class="section">
      <div class="section-header"><h2>🧾 TL;DR</h2></div>
      <div class="section-content">
        <ul style="margin-left:20px; list-style: disc;">
          <li><strong>Overall:</strong> ${report.schemaHealth.overall.toFixed(1)}/10, <strong>Security issues:</strong> ${report.securityAnalysis.vulnerabilities.length}, <strong>Missing indexes:</strong> ${missingIdx}, <strong>Bloated tables:</strong> ${bloatCount}</li>
          <li><strong>Top risk:</strong> ${criticalSec > 0 ? criticalSec + ' critical security item(s)' : 'No critical security; address high/medium next'}</li>
          <li><strong>Potential savings:</strong> ~$${savings}/month after fixes</li>
        </ul>
        ${quickFixes.length ? `<h3 style="margin-top:15px">Quick Actions</h3><ol style="margin-left:20px;">${quickFixes.slice(0,5).map(f => `<li>${f.title}</li>`).join('')}</ol>` : ''}
        <div class="filter-toolbar" style="margin-top:15px; display:flex; gap:10px; flex-wrap:wrap;">
          <button class="export-btn" onclick="filterBySeverity('all')">All</button>
          <button class="export-btn" onclick="filterBySeverity('critical')">Critical</button>
          <button class="export-btn" onclick="filterBySeverity('high')">High</button>
          <button class="export-btn" onclick="filterBySeverity('medium')">Medium</button>
          <button class="export-btn" onclick="filterBySeverity('low')">Low</button>
        </div>
      </div>
    </div>`;
  }

  private generateAIExecutiveSummary(aiInsights: any, report: EnhancedDatabaseHealthReport): string {
    const priority = this.normalizeToArray(aiInsights?.priorityRecommendations);
    const roadmap = this.normalizeToArray(aiInsights?.implementationRoadmap);
    const impact = `$${report.costAnalysis?.optimizationSavings?.monthly?.toFixed ? report.costAnalysis.optimizationSavings.monthly.toFixed(0) : report.costAnalysis?.optimizationSavings?.monthly || 0}/mo`;
    const quickSql = this.collectSqlFixes(report).slice(0, 10);
    return `
    <a id="ai-exec"></a>
    <div class="section" style="border:2px solid #6c5ce7;">
      <div class="section-header" style="background:linear-gradient(135deg,#6c5ce7,#a29bfe)"><h2 style="color:white">🤖 Executive AI Summary</h2></div>
      <div class="section-content">
        <div class="dashboard" style="margin-bottom:10px;">
          <div class="metric-card"><div class="metric-icon">⚡</div><div class="metric-value">${priority.length}</div><div class="metric-label">Top Actions</div></div>
          <div class="metric-card"><div class="metric-icon">💰</div><div class="metric-value">${impact}</div><div class="metric-label">Est. Monthly Savings</div></div>
          <div class="metric-card"><div class="metric-icon">🗓️</div><div class="metric-value">${Math.max(roadmap.length, 1)}w</div><div class="metric-label">Timeline</div></div>
        </div>
        <div class="issue-grid">
          <div class="issue-card high">
            <div class="issue-header"><span class="severity-badge severity-high">PLAN</span><h3 class="issue-title">Action Matrix</h3></div>
            <div class="issue-content">
              <table style="width:100%; border-collapse:collapse;">
                <thead><tr><th style="text-align:left; padding:6px; border-bottom:1px solid #eee;">Priority</th><th style="text-align:left; padding:6px; border-bottom:1px solid #eee;">Action</th><th style="text-align:left; padding:6px; border-bottom:1px solid #eee;">Owner</th><th style="text-align:left; padding:6px; border-bottom:1px solid #eee;">ETA</th></tr></thead>
                <tbody>
                  ${priority.slice(0,8).map((p, i) => `<tr><td style="padding:6px;">P${i+1}</td><td style="padding:6px;">${p}</td><td style="padding:6px;">DBA</td><td style="padding:6px;">${i<3?'This week':'Next'}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <div class="issue-card medium">
            <div class="issue-header"><span class="severity-badge severity-medium">DO</span><h3 class="issue-title">Copy-and-Run SQL</h3></div>
            <div class="issue-content">
              ${quickSql.length ? `<div class="sql-code">${quickSql.join('\n')}</div>` : '<p>No automated SQL available.</p>'}
            </div>
          </div>
          <div class="issue-card low">
            <div class="issue-header"><span class="severity-badge severity-low">TRACK</span><h3 class="issue-title">Roadmap</h3></div>
            <div class="issue-content">
              <div class="roadmap">${roadmap.map((r, i) => `<div class="roadmap-item"><div class="roadmap-week">Week ${i+1}</div><div>${r}</div></div>`).join('')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }
  /**
   * Generate a modern, user-friendly HTML report
   */
  generateEnhancedHTMLReport(report: EnhancedDatabaseHealthReport): string {
    const templatesEnabled = false;
    const quickFixes = this.getQuickFixes(report);
    const allSql = this.collectSqlFixes(report);
    const isAI = Boolean(report.aiInsights);
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Health Audit Report</title>
    <style>
      /* Minimal inline icons via Unicode fallback; offline-friendly */
    </style>
    <script>
      // Minimal inline Chart.js-like radar without external deps is complex; fallback to static numbers.
      // For offline mode, we skip external chart libs. Values still visible in cards.
    </script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6; 
            color: #333; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container { 
            max-width: 1400px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 20px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header { 
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white; 
            padding: 40px 30px; 
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
            animation: float 20s infinite linear;
        }
        
        @keyframes float {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        
        .header h1 { 
            font-size: 3em; 
            margin-bottom: 10px; 
            position: relative;
            z-index: 1;
        }
        
        .header p { 
            opacity: 0.9; 
            font-size: 1.2em; 
            position: relative;
            z-index: 1;
        }
        
        .header .timestamp {
            margin-top: 15px;
            font-size: 0.9em;
            opacity: 0.8;
            position: relative;
            z-index: 1;
        }
        
        .content { padding: 40px; }
        
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin-bottom: 40px;
        }
        
        .metric-card {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            position: relative;
            overflow: hidden;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .metric-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 30px rgba(0,0,0,0.15);
        }
        
        .metric-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #667eea, #764ba2);
        }
        
        .metric-value {
            font-size: 3em;
            font-weight: bold;
            margin-bottom: 10px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .metric-label {
            color: #666;
            font-size: 1.1em;
            font-weight: 500;
        }
        
        .metric-icon {
            font-size: 2em;
            margin-bottom: 15px;
            color: #667eea;
        }
        
        .section {
            background: white;
            margin-bottom: 30px;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            overflow: hidden;
            border: 1px solid #f0f0f0;
        }
        
        .section-header {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 25px 30px;
            border-bottom: 2px solid #e9ecef;
        }
        
        .section-header h2 {
            color: #495057;
            font-size: 1.8em;
            margin: 0;
            display: flex;
            align-items: center;
        }
        
        .section-header i {
            margin-right: 15px;
            color: #667eea;
        }
        
        .section-content {
            padding: 30px;
        }
        
        .score-display {
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 20px 0;
        }
        
        .score-circle {
            position: relative;
            width: 120px;
            height: 120px;
            margin-right: 30px;
        }
        
        .score-number {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 2em;
            font-weight: bold;
            color: #333;
        }
        
        .score-description {
            flex: 1;
            font-size: 1.1em;
            color: #666;
        }
        
        .chart-container {
            margin: 30px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            position: relative;
            height: 400px;
        }
        
        .issue-grid {
            display: grid;
            gap: 20px;
            margin-top: 20px;
        }
        
        .issue-card {
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid;
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s ease;
        }
        
        .issue-card:hover {
            transform: translateX(5px);
        }
        
        .issue-card.critical { border-left-color: #dc3545; background: #fdf2f2; }
        .issue-card.high { border-left-color: #fd7e14; background: #fef8f3; }
        .issue-card.medium { border-left-color: #ffc107; background: #fffbf0; }
        .issue-card.low { border-left-color: #28a745; background: #f0f8f4; }
        
        .issue-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .severity-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
            text-transform: uppercase;
            margin-right: 15px;
        }
        
        .severity-critical { background: #dc3545; color: white; }
        .severity-high { background: #fd7e14; color: white; }
        .severity-medium { background: #ffc107; color: #000; }
        .severity-low { background: #28a745; color: white; }
        
        .issue-title {
            font-size: 1.2em;
            font-weight: 600;
            color: #333;
            margin: 0;
        }
        
        .issue-content {
            margin-top: 15px;
        }
        
        .issue-section {
            margin-bottom: 15px;
        }
        
        .issue-section h4 {
            color: #555;
            margin-bottom: 8px;
            font-size: 1em;
            font-weight: 600;
        }
        
        .issue-section p {
            color: #666;
            line-height: 1.5;
        }
        
        .before-after {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 20px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .before, .after {
            text-align: center;
        }
        
        .before h4 {
            color: #dc3545;
            margin-bottom: 10px;
        }
        
        .after h4 {
            color: #28a745;
            margin-bottom: 10px;
        }
        
        .improvement-badge {
            display: inline-block;
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: bold;
            margin-top: 10px;
        }
        
        .sql-code {
            background: #2d3748;
            color: #e2e8f0;
            padding: 15px 20px;
            border-radius: 8px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.9em;
            margin: 15px 0;
            overflow-x: auto;
            white-space: pre-wrap;
            border: 1px solid #4a5568;
        }
        
        .recommendation-grid {
            display: grid;
            gap: 25px;
            margin-top: 20px;
        }
        
        .recommendation-card {
            background: linear-gradient(135deg, #e7f3ff 0%, #f0f8ff 100%);
            padding: 25px;
            border-radius: 12px;
            border: 2px solid #b3d9ff;
            position: relative;
        }
        
        .recommendation-card::before {
            content: '💡';
            position: absolute;
            top: 15px;
            right: 20px;
            font-size: 1.5em;
        }
        
        .recommendation-title {
            color: #0056b3;
            font-size: 1.3em;
            font-weight: 600;
            margin-bottom: 15px;
        }
        
        .implementation-time {
            display: inline-block;
            background: #0056b3;
            color: white;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 0.8em;
            margin-top: 10px;
        }
        
        .risk-indicator {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 0.8em;
            margin-left: 10px;
        }
        
        .risk-low { background: #d4edda; color: #155724; }
        .risk-medium { background: #fff3cd; color: #856404; }
        .risk-high { background: #f8d7da; color: #721c24; }
        
        .ai-insights {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            margin-top: 30px;
        }
        
        .ai-insights h3 {
            margin-bottom: 20px;
            font-size: 1.5em;
        }
        
        .insight-item {
            background: rgba(255, 255, 255, 0.1);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            backdrop-filter: blur(10px);
        }
        
        .roadmap {
            display: grid;
            gap: 15px;
            margin-top: 20px;
        }
        
        .roadmap-item {
            background: rgba(255, 255, 255, 0.1);
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #fff;
            display: flex;
            align-items: center;
        }
        
        .roadmap-week {
            background: white;
            color: #667eea;
            padding: 8px 12px;
            border-radius: 20px;
            font-weight: bold;
            margin-right: 15px;
            font-size: 0.9em;
        }
        
        .footer {
            text-align: center;
            padding: 30px;
            background: #f8f9fa;
            color: #666;
            border-top: 1px solid #e9ecef;
        }
        
        .export-buttons {
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 1000;
        }
        
        .export-btn {
            display: block;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            text-decoration: none;
            margin-bottom: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            transition: transform 0.2s ease;
        }
        
        .export-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
        }
        
        @media (max-width: 768px) {
            .dashboard {
                grid-template-columns: 1fr;
            }
            
            .before-after {
                grid-template-columns: 1fr;
            }
            
            .content {
                padding: 20px;
            }
            
            .export-buttons {
                position: relative;
                bottom: auto;
                right: auto;
                text-align: center;
                margin-top: 20px;
            }
        }
        
        .tooltip {
            position: relative;
            cursor: help;
        }
        
        .tooltip:hover::after {
            content: attr(data-tooltip);
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 0.8em;
            white-space: nowrap;
            z-index: 1000;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-heartbeat"></i> Database Health Audit Report</h1>
            <p>Comprehensive analysis and optimization recommendations</p>
            <div class="timestamp">
                Generated on ${new Date().toLocaleString()} | 
                Database: ${report.databaseInfo.version.split(' ')[0]}
            </div>
        </div>
        
        <div class="content">
            ${this.generateTOC(report, isAI)}
            ${this.generateTLDR(report, quickFixes)}
            ${isAI ? this.generateAIExecutiveSummary(report.aiInsights, report) : ''}
            <div class="section" style="margin-top:0">
              <div class="section-header">
                <h2>⚡ At a Glance</h2>
              </div>
              <div class="section-content">
                <div class="dashboard">
                  <div class="metric-card"><div class="metric-icon">🏥</div><div class="metric-value">${report.schemaHealth.overall.toFixed(1)}/10</div><div class="metric-label">Health</div></div>
                  <div class="metric-card"><div class="metric-icon">🛡️</div><div class="metric-value">${report.securityAnalysis.vulnerabilities.length}</div><div class="metric-label">Security Issues</div></div>
                  <div class="metric-card"><div class="metric-icon">🗄️</div><div class="metric-value">${report.databaseInfo.tableCount}</div><div class="metric-label">Tables</div></div>
                  <div class="metric-card"><div class="metric-icon">🔍</div><div class="metric-value">${report.indexAnalysis.missingIndexes.length}</div><div class="metric-label">Missing Indexes</div></div>
                </div>
                <h3 style="margin-top:20px">🎯 Top Fixes</h3>
                ${quickFixes.length ? `<div class="issue-grid">${quickFixes.slice(0,6).map(f => `
                  <div class="issue-card ${f.severity}">
                    <div class="issue-header">
                      <span class="severity-badge severity-${f.severity}">${f.severity.toUpperCase()}</span>
                      <h3 class="issue-title">${f.title}</h3>
                    </div>
                    <div class="issue-content">
                      <p>${f.description}</p>
                      ${f.sql ? `<div class="sql-code">${f.sql}</div>` : ''}
                    </div>
                  </div>`).join('')}</div>` : '<p>No immediate fixes detected.</p>'}
                ${allSql.length ? `<div style="margin-top:15px"><a class="export-btn" href="#" onclick='navigator.clipboard.writeText(${JSON.stringify(allSql.join("\n"))});return false;'>📋 Copy All SQL Fixes</a></div>` : ''}
              </div>
            </div>
            <!-- Executive Dashboard -->
            <div class="dashboard">
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-database"></i></div>
                    <div class="metric-value">${report.schemaHealth.overall.toFixed(1)}/10</div>
                    <div class="metric-label">Overall Health Score</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-table"></i></div>
                    <div class="metric-value">${report.databaseInfo.tableCount}</div>
                    <div class="metric-label">Tables</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-list"></i></div>
                    <div class="metric-value">${report.databaseInfo.indexCount}</div>
                    <div class="metric-label">Indexes</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-shield-alt"></i></div>
                    <div class="metric-value">${report.securityAnalysis.vulnerabilities.length}</div>
                    <div class="metric-label">Security Issues</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-chart-line"></i></div>
                    <div class="metric-value">${report.performanceIssues.length}</div>
                    <div class="metric-label">Performance Issues</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-dollar-sign"></i></div>
                    <div class="metric-value">$${report.costAnalysis.optimizationSavings.monthly.toFixed(0)}</div>
                    <div class="metric-label">Monthly Savings Potential</div>
                </div>
            </div>

            <!-- Schema Health Breakdown -->
            <a id="schema"></a>
            <div class="section">
                <div class="section-header">
                    <h2><i class="fas fa-project-diagram"></i> Schema Health Analysis</h2>
                    <p class="section-description">Comprehensive analysis of your database schema using live system catalogs (information_schema/pg_stat). Each finding includes the reason and how to fix it.</p>
                </div>
                <div class="section-content">
                    <div class="chart-container">
                        <canvas id="schemaHealthChart"></canvas>
                    </div>
                    
                    <!-- Detailed Metrics Dashboard -->
                    <div class="dashboard" style="margin-top: 30px;">
                        <div class="metric-card">
                            <div class="metric-icon"><i class="fas fa-star"></i></div>
                            <div class="metric-value">${report.schemaHealth.overall}/10</div>
                            <div class="metric-label">Overall Score</div>
                            <div class="metric-trend">${this.getScoreDescription(report.schemaHealth.overall)}</div>
                        </div>
                        
                        <div class="metric-card">
                            <div class="metric-icon"><i class="fas fa-layer-group"></i></div>
                            <div class="metric-value">${report.schemaHealth.normalization}/10</div>
                            <div class="metric-label">Normalization</div>
                            <div class="metric-trend">${this.getNormalizationDescription(report.schemaHealth.normalization)}</div>
                        </div>
                        
                        <div class="metric-card">
                            <div class="metric-icon"><i class="fas fa-link"></i></div>
                            <div class="metric-value">${report.schemaHealth.foreignKeyIntegrity}/10</div>
                            <div class="metric-label">FK Integrity</div>
                            <div class="metric-trend">${this.getFKDescription(report.schemaHealth.foreignKeyIntegrity)}</div>
                        </div>
                        
                        <div class="metric-card">
                            <div class="metric-icon"><i class="fas fa-tags"></i></div>
                            <div class="metric-value">${report.schemaHealth.naming}/10</div>
                            <div class="metric-label">Naming</div>
                            <div class="metric-trend">${this.getNamingDescription(report.schemaHealth.naming)}</div>
                        </div>
                    </div>
                    
                    <!-- Deep Dive Analysis -->
                    <div class="analysis-deep-dive" style="margin-top: 40px;">
                        <h3><i class="fas fa-microscope"></i> Schema Health Deep Dive</h3>
                        
                        <!-- What is Schema Health -->
                        <div class="analysis-section" style="margin-bottom: 30px; padding: 25px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; border-left: 5px solid #667eea;">
                            <h4><i class="fas fa-info-circle" style="color: #667eea;"></i> Understanding Schema Health</h4>
                            <div class="explanation-box">
                                <p style="font-size: 1.1em; margin-bottom: 20px;"><strong>Schema health</strong> measures how well your database structure follows industry best practices, design patterns, and optimization principles. A healthy schema directly impacts your application's performance, maintainability, and scalability.</p>
                                
                                <div class="health-components" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 25px;">
                                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                                        <h5 style="color: #667eea; margin-bottom: 15px;"><i class="fas fa-layer-group"></i> Normalization (${report.schemaHealth.normalization}/10)</h5>
                                        <p>How well your data is organized to minimize redundancy and improve consistency. Higher normalization reduces storage and improves data integrity.</p>
                                        <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
                                            <strong>Impact:</strong> Storage efficiency, data consistency, update performance
                                        </div>
                                    </div>
                                    
                                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                                        <h5 style="color: #667eea; margin-bottom: 15px;"><i class="fas fa-link"></i> Foreign Key Integrity (${report.schemaHealth.foreignKeyIntegrity}/10)</h5>
                                        <p>Proper relationships and referential integrity constraints between tables. Ensures data consistency and prevents orphaned records.</p>
                                        <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
                                            <strong>Impact:</strong> Data consistency, query reliability, application stability
                                        </div>
                                    </div>
                                    
                                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                                        <h5 style="color: #667eea; margin-bottom: 15px;"><i class="fas fa-tags"></i> Naming Conventions (${report.schemaHealth.naming}/10)</h5>
                                        <p>Consistent and meaningful naming patterns for tables, columns, and constraints. Improves code readability and team collaboration.</p>
                                        <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
                                            <strong>Impact:</strong> Code maintainability, team productivity, tool integration
                                        </div>
                                    </div>
                                    
                                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                                        <h5 style="color: #667eea; margin-bottom: 15px;"><i class="fas fa-database"></i> Data Types (${report.schemaHealth.dataTypes}/10)</h5>
                                        <p>Appropriate data type usage for efficiency and storage optimization. Right-sized data types improve performance and reduce storage costs.</p>
                                        <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
                                            <strong>Impact:</strong> Storage efficiency, query performance, memory usage
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="analysis-section" style="margin: 30px 0; padding: 25px; background: #fff; border: 1px solid #eee; border-radius: 12px;">
                            <h4 style="margin-bottom: 15px;"><i class="fas fa-list-check"></i> Concrete Findings (Live)</h4>
                            ${report.schemaHealth.issues.length > 0 ? `
                            <div class="issue-grid">
                              ${report.schemaHealth.issues.map(issue => `
                                <div class="issue-card ${issue.severity}">
                                  <div class="issue-header">
                                    <span class="severity-badge severity-${issue.severity}">${issue.severity.toUpperCase()}</span>
                                    <h3 class="issue-title">${issue.table}${issue.column ? '.' + issue.column : ''}: ${issue.type.replace('_',' ')}</h3>
                                  </div>
                                  <div class="issue-content">
                                    <div class="issue-section">
                                      <h4>🧠 Why this is a problem</h4>
                                      <p>${issue.description}</p>
                                    </div>
                                    <div class="issue-section">
                                      <h4>🛠 How to improve</h4>
                                      <p>${issue.suggestion}</p>
                                      ${issue.sqlFix ? `<div class="sql-code">${issue.sqlFix}</div>` : ''}
                                    </div>
                                    <div class="before-after">
                                      <div class="before">
                                        <h4>Before</h4>
                                        <p>${issue.beforeFix || 'Less efficient or risky state'}</p>
                                      </div>
                                      <div class="after">
                                        <h4>After</h4>
                                        <p>${issue.afterFix || 'Improved integrity or performance'}</p>
                                        <span class="improvement-badge">${issue.expectedImprovement || 'Measurable improvement'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              `).join('')}
                            </div>` : '<p>No schema issues detected.</p>'}
                        </div>
                        
                        <!-- Normalization Deep Dive -->
                        <details class="analysis-section" style="margin-bottom: 30px; padding: 25px; background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%); border-radius: 12px; border-left: 5px solid #007bff;"><summary style="cursor:pointer; font-weight:600; margin-bottom:10px;">Normalization Analysis (details)</summary>
                            <h4><i class="fas fa-layer-group" style="color: #007bff;"></i> Database Normalization Analysis</h4>
                            <div class="explanation-box">
                                <div class="score-explanation" style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 2px solid #007bff;">
                                    <div class="score-header" style="font-size: 1.2em; font-weight: bold; color: #007bff;">
                                        Current Score: ${report.schemaHealth.normalization}/10 - ${this.getNormalizationDescription(report.schemaHealth.normalization)}
                                    </div>
                                </div>
                                
                                <h5 style="color: #007bff; margin-bottom: 20px;">Understanding Database Normalization:</h5>
                                <p style="margin-bottom: 25px;">Normalization is the process of organizing data in a database to reduce redundancy and improve data integrity. It involves decomposing tables to eliminate data redundancy and undesirable characteristics like insertion, update, and deletion anomalies.</p>
                                
                                <div class="normalization-levels" style="display: grid; gap: 25px;">
                                    <div class="norm-level" style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 3px 15px rgba(0,123,255,0.1); border-left: 4px solid #007bff;">
                                        <h6 style="color: #007bff; font-size: 1.1em; margin-bottom: 15px;"><strong>1NF (First Normal Form)</strong></h6>
                                        <ul style="margin-bottom: 15px; color: #333;">
                                            <li>✓ Each column contains atomic (indivisible) values</li>
                                            <li>✓ Each record is unique</li>
                                            <li>✓ No repeating groups or arrays in columns</li>
                                        </ul>
                                        <div class="example" style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 3px solid #28a745;">
                                            <strong style="color: #28a745;">✅ Example - Moving to 1NF:</strong>
                                            <div class="code-block" style="background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 6px; margin-top: 10px; font-family: 'Courier New', monospace; font-size: 0.9em; overflow-x: auto;">-- ❌ Bad: Multiple values in one column (violates 1NF)
CREATE TABLE users (
    id SERIAL,
    name VARCHAR(100),
    phone_numbers TEXT -- "123-456-7890, 987-654-3210"
);

-- ✅ Good: Separate table for multiple values (1NF compliant)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE user_phones (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    phone_number VARCHAR(20),
    phone_type VARCHAR(20) -- 'mobile', 'home', 'work'
);</div>
                                        </div>
                                    </div>
                                    
                                    <div class="norm-level" style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 3px 15px rgba(0,123,255,0.1); border-left: 4px solid #17a2b8;">
                                        <h6 style="color: #17a2b8; font-size: 1.1em; margin-bottom: 15px;"><strong>2NF (Second Normal Form)</strong></h6>
                                        <ul style="margin-bottom: 15px; color: #333;">
                                            <li>✓ Must be in 1NF</li>
                                            <li>✓ No partial dependencies on composite primary keys</li>
                                            <li>✓ All non-key attributes depend on the entire primary key</li>
                                        </ul>
                                        <div class="example" style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 3px solid #28a745;">
                                            <strong style="color: #28a745;">✅ Example - Eliminating Partial Dependencies:</strong>
                                            ${templatesEnabled ? `<div class="code-block" style="background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 6px; margin-top: 10px; font-family: 'Courier New', monospace; font-size: 0.9em; overflow-x: auto;">${this.generateRealNormalizationExample(report)}</div>` : ''}
                                        </div>
                                    </div>
                                    
                                    <div class="norm-level" style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 3px 15px rgba(0,123,255,0.1); border-left: 4px solid #28a745;">
                                        <h6 style="color: #28a745; font-size: 1.1em; margin-bottom: 15px;"><strong>3NF (Third Normal Form)</strong></h6>
                                        <ul style="margin-bottom: 15px; color: #333;">
                                            <li>✓ Must be in 2NF</li>
                                            <li>✓ No transitive dependencies</li>
                                            <li>✓ Non-key attributes depend only on the primary key</li>
                                        </ul>
                                        <div class="example" style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 3px solid #28a745;">
                                            <strong style="color: #28a745;">✅ Example - Eliminating Transitive Dependencies:</strong>
                                            <div class="code-block" style="background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 6px; margin-top: 10px; font-family: 'Courier New', monospace; font-size: 0.9em; overflow-x: auto;">-- ❌ Bad: Transitive dependency (violates 3NF)
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    department_id INT,
    department_name VARCHAR(100), -- Depends on department_id, not employee id
    department_budget DECIMAL(12,2) -- Also depends on department_id
);

-- ✅ Good: Remove transitive dependencies (3NF compliant)
CREATE TABLE departments (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    budget DECIMAL(12,2),
    manager_id INT
);

CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    department_id INT REFERENCES departments(id),
    hire_date DATE,
    salary DECIMAL(10,2)
);</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-radius: 10px; border-left: 4px solid #ffc107;">
                                    <h5 style="color: #856404; margin-bottom: 15px;"><i class="fas fa-balance-scale"></i> Normalization Trade-offs:</h5>
                                    <div class="impact-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
                                        <div class="impact-positive" style="background: rgba(40, 167, 69, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #28a745;">
                                            <strong style="color: #28a745;"><i class="fas fa-check-circle"></i> Benefits</strong>
                                            <ul style="margin-top: 10px; color: #333;">
                                                <li><strong>Reduced Redundancy:</strong> Less duplicate data</li>
                                                <li><strong>Improved Integrity:</strong> Updates only happen in one place</li>
                                                <li><strong>Storage Efficiency:</strong> Smaller database size</li>
                                                <li><strong>Easier Maintenance:</strong> Changes are isolated</li>
                                                <li><strong>Better Consistency:</strong> Data anomalies prevented</li>
                                            </ul>
                                        </div>
                                        <div class="impact-negative" style="background: rgba(220, 53, 69, 0.1); padding: 15px; border-radius: 8px; border-left: 3px solid #dc3545;">
                                            <strong style="color: #dc3545;"><i class="fas fa-exclamation-triangle"></i> Trade-offs</strong>
                                            <ul style="margin-top: 10px; color: #333;">
                                                <li><strong>Complex Queries:</strong> More JOINs required</li>
                                                <li><strong>Read Performance:</strong> Potential query slowdown</li>
                                                <li><strong>Index Strategy:</strong> More complex indexing needed</li>
                                                <li><strong>Learning Curve:</strong> Requires understanding of relationships</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </details>
                        
                        <!-- Foreign Key Analysis -->
                        <details class="analysis-section" style="margin-bottom: 30px; padding: 25px; background: linear-gradient(135deg, #fff0f5 0%, #ffe6f0 100%); border-radius: 12px; border-left: 5px solid #e91e63;"><summary style="cursor:pointer; font-weight:600; margin-bottom:10px;">Foreign Key Integrity (details)</summary>
                            <h4><i class="fas fa-link" style="color: #e91e63;"></i> Foreign Key Integrity Analysis</h4>
                            <div class="explanation-box">
                                <div class="score-explanation" style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 2px solid #e91e63;">
                                    <div class="score-header" style="font-size: 1.2em; font-weight: bold; color: #e91e63;">
                                        Current Score: ${report.schemaHealth.foreignKeyIntegrity}/10 - ${this.getFKDescription(report.schemaHealth.foreignKeyIntegrity)}
                                    </div>
                                </div>
                                
                                <h5 style="color: #e91e63; margin-bottom: 20px;">Understanding Foreign Key Constraints:</h5>
                                <p style="margin-bottom: 25px;">Foreign keys are the backbone of relational database integrity. They establish and enforce relationships between tables, ensuring that data remains consistent and valid across your entire database schema.</p>
                                
                                <div class="fk-concepts" style="display: grid; gap: 25px;">
                                    <div class="concept" style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 3px 15px rgba(233,30,99,0.1); border-left: 4px solid #e91e63;">
                                        <h6 style="color: #e91e63; font-size: 1.1em; margin-bottom: 15px;"><strong><i class="fas fa-shield-alt"></i> Referential Integrity</strong></h6>
                                        <p style="margin-bottom: 15px;">Ensures that foreign key values always refer to existing primary key values in the referenced table. This prevents orphaned records and maintains data consistency.</p>
                                        <div class="example" style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 3px solid #28a745;">
                                            <strong style="color: #28a745;">✅ Proper Foreign Key Implementation:</strong>
                                            <div class="code-block" style="background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 6px; margin-top: 10px; font-family: 'Courier New', monospace; font-size: 0.9em; overflow-x: auto;">${this.generateRealForeignKeyExample(report)}</div>
                                        </div>
                                    </div>
                                    
                                    <div class="concept" style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 3px 15px rgba(233,30,99,0.1); border-left: 4px solid #ff9800;">
                                        <h6 style="color: #ff9800; font-size: 1.1em; margin-bottom: 15px;"><strong><i class="fas fa-cogs"></i> CASCADE OPTIONS</strong></h6>
                                        <p style="margin-bottom: 15px;">Control how changes to parent records affect child records:</p>
                                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                                            <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 3px solid #007bff;">
                                                <strong style="color: #007bff;">RESTRICT</strong>
                                                <p style="font-size: 0.9em; margin-top: 5px;">Prevents deletion/update if references exist</p>
                                                <code style="background: #e9ecef; padding: 2px 4px; border-radius: 3px; font-size: 0.8em;">ON DELETE RESTRICT</code>
                                            </div>
                                            <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 3px solid #28a745;">
                                                <strong style="color: #28a745;">CASCADE</strong>
                                                <p style="font-size: 0.9em; margin-top: 5px;">Automatically deletes/updates related records</p>
                                                <code style="background: #e9ecef; padding: 2px 4px; border-radius: 3px; font-size: 0.8em;">ON DELETE CASCADE</code>
                                            </div>
                                            <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 3px solid #ffc107;">
                                                <strong style="color: #e68900;">SET NULL</strong>
                                                <p style="font-size: 0.9em; margin-top: 5px;">Sets foreign key to NULL when parent is deleted</p>
                                                <code style="background: #e9ecef; padding: 2px 4px; border-radius: 3px; font-size: 0.8em;">ON DELETE SET NULL</code>
                                            </div>
                                            <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 3px solid #6f42c1;">
                                                <strong style="color: #6f42c1;">SET DEFAULT</strong>
                                                <p style="font-size: 0.9em; margin-top: 5px;">Sets foreign key to default value</p>
                                                <code style="background: #e9ecef; padding: 2px 4px; border-radius: 3px; font-size: 0.8em;">ON DELETE SET DEFAULT</code>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div style="margin-top: 25px; padding: 20px; background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-radius: 10px; border-left: 4px solid #ffc107;">
                                    <h5 style="color: #856404; margin-bottom: 15px;"><i class="fas fa-exclamation-triangle"></i> Common Foreign Key Issues & Solutions:</h5>
                                    <div style="display: grid; gap: 15px;">
                                        <div class="issue-item" style="background: white; padding: 15px; border-radius: 8px; border-left: 3px solid #dc3545;">
                                            <strong style="color: #dc3545;"><i class="fas fa-times-circle"></i> Missing Foreign Key Constraints</strong>
                                            <p style="margin: 8px 0; color: #333;">Tables have logical relationships but no formal constraints enforcing them.</p>
                                            <div class="solution" style="margin-top: 10px;">
                                                <strong style="color: #28a745;">🔧 Solution:</strong>
                                             ${templatesEnabled ? `<div class="code-block" style="background: #2d3748; color: #e2e8f0; padding: 10px; border-radius: 4px; margin-top: 5px; font-family: 'Courier New', monospace; font-size: 0.85em;">${this.generateRealConstraintExample(report)}</div>` : ''}
                                            </div>
                                        </div>
                                        
                                        <div class="issue-item" style="background: white; padding: 15px; border-radius: 8px; border-left: 3px solid #ffc107;">
                                            <strong style="color: #e68900;"><i class="fas fa-unlink"></i> Orphaned Records</strong>
                                            <p style="margin: 8px 0; color: #333;">Foreign key values that don't match any primary key in the referenced table.</p>
                                            <div class="solution" style="margin-top: 10px;">
                                                <strong style="color: #28a745;">🔍 Find orphaned records:</strong>
                                                 ${templatesEnabled ? `<div class="code-block" style="background: #2d3748; color: #e2e8f0; padding: 10px; border-radius: 4px; margin-top: 5px; font-family: 'Courier New', monospace; font-size: 0.85em;">${this.generateRealOrphanedRecordsExample(report)}</div>` : ''}
                                            </div>
                                        </div>
                                        
                                        <div class="issue-item" style="background: white; padding: 15px; border-radius: 8px; border-left: 3px solid #17a2b8;">
                                            <strong style="color: #17a2b8;"><i class="fas fa-exchange-alt"></i> Data Type Mismatches</strong>
                                            <p style="margin: 8px 0; color: #333;">Foreign key and primary key columns have different data types or constraints.</p>
                                            <div class="solution" style="margin-top: 10px;">
                                                <strong style="color: #28a745;">🔧 Fix data type alignment:</strong>
                                                <div class="code-block" style="background: #2d3748; color: #e2e8f0; padding: 10px; border-radius: 4px; margin-top: 5px; font-family: 'Courier New', monospace; font-size: 0.85em;">-- Ensure matching data types
ALTER TABLE orders ALTER COLUMN customer_id TYPE INT;

-- Ensure matching constraints
ALTER TABLE orders ALTER COLUMN customer_id SET NOT NULL;</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </details>
                        
                        <!-- Naming Convention Analysis -->
                        <details class="analysis-section" style="margin-bottom: 30px; padding: 25px; background: linear-gradient(135deg, #f0fff0 0%, #e6ffe6 100%); border-radius: 12px; border-left: 5px solid #28a745;"><summary style="cursor:pointer; font-weight:600; margin-bottom:10px;">Naming Convention (details)</summary>
                            <h4><i class="fas fa-tags" style="color: #28a745;"></i> Naming Convention Analysis</h4>
                            <div class="explanation-box">
                                <div class="score-explanation" style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 2px solid #28a745;">
                                    <div class="score-header" style="font-size: 1.2em; font-weight: bold; color: #28a745;">
                                        Current Score: ${report.schemaHealth.naming}/10 - ${this.getNamingDescription(report.schemaHealth.naming)}
                                    </div>
                                </div>
                                
                                <h5 style="color: #28a745; margin-bottom: 20px;">Database Naming Best Practices:</h5>
                                <p style="margin-bottom: 25px;">Consistent naming conventions are crucial for database maintainability, team collaboration, and tool integration. Good naming makes your schema self-documenting and reduces the learning curve for new team members.</p>
                                
                                <div class="naming-rules" style="display: grid; gap: 25px;">
                                    <div class="rule-category" style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 3px 15px rgba(40,167,69,0.1); border-left: 4px solid #28a745;">
                                        <h6 style="color: #28a745; font-size: 1.1em; margin-bottom: 15px;"><strong><i class="fas fa-table"></i> Table Names</strong></h6>
                                        <ul style="margin-bottom: 15px; color: #333;">
                                                                                    <li><strong>Use plural nouns:</strong> <code>${this.getTableNamesFromReport(report).slice(0, 3).join('</code>, <code>') || 'institutions, user_roles, delete_reasons'}</code></li>
                                        <li><strong>Use snake_case:</strong> <code>${this.getTableNamesFromReport(report).filter(name => name.includes('_')).slice(0, 2).join('</code>, <code>') || 'user_education_institutions, user_roles'}</code></li>
                                            <li><strong>Be descriptive but concise:</strong> <code>customer_addresses</code> not <code>cust_addr</code></li>
                                            <li><strong>Avoid abbreviations:</strong> Unless universally understood (like <code>id</code>)</li>
                                        </ul>
                                        <div class="example" style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 3px solid #28a745;">
                                            <strong style="color: #28a745;">✅ Good table naming examples:</strong>
                                            <div class="code-block" style="background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 6px; margin-top: 10px; font-family: 'Courier New', monospace; font-size: 0.9em; overflow-x: auto;">-- ✅ Good table names (from your database)
${this.getTableNamesFromReport(report).filter(name => name.includes('_')).map(name => `CREATE TABLE ${name} (...);`).join('\n') || 'CREATE TABLE user_education_institutions (...);\nCREATE TABLE user_roles (...);'}

-- ❌ Avoid these patterns
CREATE TABLE user (...);        -- Singular
CREATE TABLE UserProfiles (...); -- CamelCase
CREATE TABLE ord_itm (...);     -- Abbreviations
CREATE TABLE cust_addr (...);   -- Unclear abbreviations</div>
                                        </div>
                                    </div>
                                    
                                    <div class="rule-category" style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 3px 15px rgba(40,167,69,0.1); border-left: 4px solid #007bff;">
                                        <h6 style="color: #007bff; font-size: 1.1em; margin-bottom: 15px;"><strong><i class="fas fa-columns"></i> Column Names</strong></h6>
                                        <ul style="margin-bottom: 15px; color: #333;">
                                            <li><strong>Primary keys:</strong> Use <code>id</code> or <code>table_name_id</code></li>
                                            <li><strong>Foreign keys:</strong> Use <code>referenced_table_id</code></li>
                                            <li><strong>Timestamps:</strong> <code>created_at</code>, <code>updated_at</code>, <code>deleted_at</code></li>
                                            <li><strong>Boolean flags:</strong> <code>is_active</code>, <code>has_permission</code></li>
                                            <li><strong>Be descriptive:</strong> <code>email_address</code> not <code>email</code> if it stores full addresses</li>
                                        </ul>
                                        <div class="example" style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 3px solid #007bff;">
                                            <strong style="color: #007bff;">✅ Good column naming examples:</strong>
                                            <div class="code-block" style="background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 6px; margin-top: 10px; font-family: 'Courier New', monospace; font-size: 0.9em; overflow-x: auto;">-- ✅ Well-named tables (from your actual database)
${this.getTableNamesFromReport(report).slice(0, 2).map(name => `CREATE TABLE ${name} (\n    id SERIAL PRIMARY KEY,\n    -- Add your actual columns here\n    created_at TIMESTAMP DEFAULT NOW()\n);`).join('\n\n') || 'CREATE TABLE institutions (\n    id SERIAL PRIMARY KEY,\n    created_at TIMESTAMP DEFAULT NOW()\n);'}</div>
                                        </div>
                                    </div>
                                    
                                    <div class="rule-category" style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 3px 15px rgba(40,167,69,0.1); border-left: 4px solid #6f42c1;">
                                        <h6 style="color: #6f42c1; font-size: 1.1em; margin-bottom: 15px;"><strong><i class="fas fa-search"></i> Index & Constraint Names</strong></h6>
                                        <ul style="margin-bottom: 15px; color: #333;">
                                            <li><strong>Regular indexes:</strong> <code>idx_tablename_columnname</code></li>
                                            <li><strong>Unique indexes:</strong> <code>uk_tablename_columnname</code></li>
                                            <li><strong>Foreign keys:</strong> <code>fk_tablename_referenced_table</code></li>
                                            <li><strong>Check constraints:</strong> <code>chk_tablename_description</code></li>
                                        </ul>
                                        <div class="example" style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 3px solid #6f42c1;">
                                            <strong style="color: #6f42c1;">✅ Good index and constraint naming:</strong>
                                             ${templatesEnabled ? `<div class="code-block" style="background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 6px; margin-top: 10px; font-family: 'Courier New', monospace; font-size: 0.9em; overflow-x: auto;">${this.generateRealIndexExample(report)}

-- ✅ Well-named foreign key constraints
ALTER TABLE orders ADD CONSTRAINT fk_orders_customer 
    FOREIGN KEY (customer_id) REFERENCES users(id);
    
ALTER TABLE orders ADD CONSTRAINT fk_orders_shipping_address 
    FOREIGN KEY (shipping_address_id) REFERENCES addresses(id);

-- ✅ Well-named check constraints
ALTER TABLE users ADD CONSTRAINT chk_users_email_format 
    CHECK (email_address ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    
ALTER TABLE orders ADD CONSTRAINT chk_orders_amount_positive 
     CHECK (total_amount > 0);</div>` : ''}
                                        </div>
                                    </div>
                                </div>
                                
                                <div style="margin-top: 25px; padding: 20px; background: linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%); border-radius: 10px; border-left: 4px solid #28a745;">
                                    <h5 style="color: #155724; margin-bottom: 15px;"><i class="fas fa-lightbulb"></i> Why Naming Conventions Matter:</h5>
                                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                                        <div>
                                            <strong style="color: #28a745;"><i class="fas fa-eye"></i> Code Readability</strong>
                                            <p style="font-size: 0.9em; margin-top: 5px; color: #333;">Self-documenting database structure reduces need for extensive documentation</p>
                                        </div>
                                        <div>
                                            <strong style="color: #28a745;"><i class="fas fa-users"></i> Team Collaboration</strong>
                                            <p style="font-size: 0.9em; margin-top: 5px; color: #333;">Consistent patterns reduce confusion and onboarding time</p>
                                        </div>
                                        <div>
                                            <strong style="color: #28a745;"><i class="fas fa-wrench"></i> Tool Integration</strong>
                                            <p style="font-size: 0.9em; margin-top: 5px; color: #333;">ORMs and code generators work better with consistent naming</p>
                                        </div>
                                        <div>
                                            <strong style="color: #28a745;"><i class="fas fa-search-plus"></i> Maintenance</strong>
                                            <p style="font-size: 0.9em; margin-top: 5px; color: #333;">Easier to understand and modify database structure later</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </details>
                    </div>
                    
                    <script>
                        const ctx = document.getElementById('schemaHealthChart').getContext('2d');
                        new Chart(ctx, {
                            type: 'radar',
                            data: {
                                labels: ['Normalization', 'Index Efficiency', 'FK Integrity', 'Data Types', 'Naming', 'Security'],
                                datasets: [{
                                    label: 'Current Score',
                                    data: [${report.schemaHealth.normalization}, ${report.schemaHealth.indexEfficiency}, ${report.schemaHealth.foreignKeyIntegrity}, ${report.schemaHealth.dataTypes}, ${report.schemaHealth.naming}, ${report.schemaHealth.security}],
                                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                                    borderColor: 'rgba(102, 126, 234, 1)',
                                    borderWidth: 2,
                                    pointBackgroundColor: 'rgba(102, 126, 234, 1)'
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    r: {
                                        beginAtZero: true,
                                        max: 10,
                                        ticks: {
                                            stepSize: 2
                                        }
                                    }
                                },
                                plugins: {
                                    legend: {
                                        display: false
                                    }
                                }
                            }
                        });
                    </script>
                </div>
            </div>

            <!-- Table Analysis -->
            <a id="tables"></a>
            <details class="section"><summary style="cursor:pointer; padding:25px; display:block; font-weight:600;">📚 Table Analysis (details)</summary>${this.generateTableAnalysisSection(report.tableAnalysis)}</details>

            <!-- Security Analysis -->
            <a id="security"></a>
            <details class="section"><summary style="cursor:pointer; padding:25px; display:block; font-weight:600;">🔒 Security Analysis (details)</summary>${this.generateSecurityAnalysisSection(report.securityAnalysis)}</details>

            <!-- Performance Issues -->
            <a id="performance"></a>
            <details class="section"><summary style="cursor:pointer; padding:25px; display:block; font-weight:600;">⚡ Performance Issues (details)</summary>${this.generatePerformanceIssuesSection(report.performanceIssues)}</details>

            <!-- Optimization Recommendations -->
            <a id="optimization"></a>
            <details class="section"><summary style="cursor:pointer; padding:25px; display:block; font-weight:600;">💡 Optimization Recommendations (details)</summary>${this.generateOptimizationRecommendationsSection(report.optimizationRecommendations)}</details>

            <!-- AI Insights -->
            ${report.aiInsights ? `<a id="ai"></a>${this.generateAIInsightsSection(report.aiInsights)}` : ''}

            <!-- Query Performance Analysis -->
            <a id="queries"></a>
            ${this.generateQueryPerformanceSection(report)}

            <!-- Database Configuration Analysis -->
            <a id="config"></a>
            <details class="section"><summary style="cursor:pointer; padding:25px; display:block; font-weight:600;">⚙️ Configuration Analysis (details)</summary>${this.generateConfigurationSection(report.databaseInfo)}</details>

            <!-- Maintenance Schedule -->
            <a id="maintenance"></a>
            <details class="section"><summary style="cursor:pointer; padding:25px; display:block; font-weight:600;">🗓️ Maintenance Schedule (details)</summary>${this.generateMaintenanceScheduleSection(report.maintenanceRecommendations)}</details>

            <!-- Cost Analysis -->
            <a id="cost"></a>
            ${this.generateCostAnalysisSection(report.costAnalysis)}

            <!-- Database Trends & Insights -->
            <a id="trends"></a>
            ${this.generateTrendsSection(report)}
        </div>
        
        <div class="footer">
            <p><i class="fas fa-robot"></i> Generated by Enhanced SQL Analyzer v1.1.0</p>
            <p>Report ID: ${this.generateReportId()} | ${new Date().toISOString()}</p>
        </div>
    </div>
    
    <div class="export-buttons">
        <a href="#" class="export-btn" onclick="window.print()">
            <i class="fas fa-print"></i> Print Report
        </a>
        <a href="#" class="export-btn" onclick="downloadJSON()">
            <i class="fas fa-download"></i> Download JSON
        </a>
    </div>

    <script>
        function downloadJSON() {
            const report = ${JSON.stringify(report, null, 2)};
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "database-health-report-" + new Date().toISOString().split('T')[0] + ".json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        }
        // Severity filter interactions
        function filterBySeverity(level) {
          document.querySelectorAll('.issue-card').forEach(card => {
            if (level === 'all') { card.style.display = ''; return; }
            const isMatch = card.classList.contains(level);
            card.style.display = isMatch ? '' : 'none';
          });
        }
        
        // Add smooth scrolling
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });
        
        // Add click-to-copy for SQL code
        document.querySelectorAll('.sql-code').forEach(code => {
            code.style.cursor = 'pointer';
            code.title = 'Click to copy';
            code.addEventListener('click', function() {
                navigator.clipboard.writeText(this.textContent);
                const original = this.style.background;
                this.style.background = '#28a745';
                setTimeout(() => {
                    this.style.background = original;
                }, 200);
            });
        });
    </script>
</body>
</html>`;
  }

  private generateTableAnalysisSection(tableAnalysis: any): string {
    if (!tableAnalysis.tablesWithBloat.length && !tableAnalysis.tablesWithoutPK.length) {
      return '';
    }

    return `
    <div class="section">
        <div class="section-header">
            <h2><i class="fas fa-table"></i> Table Analysis</h2>
        </div>
        <div class="section-content">
            ${tableAnalysis.tablesWithBloat.length > 0 ? `
            <h3><i class="fas fa-exclamation-triangle"></i> Tables with Bloat</h3>
            <div class="issue-grid">
                ${tableAnalysis.tablesWithBloat.map((bloat: TableBloatInfo) => `
                <div class="issue-card ${this.getSeverityClass(bloat.estimatedBloat)}">
                    <div class="issue-header">
                        <span class="severity-badge severity-${this.getSeverityClass(bloat.estimatedBloat)}">${this.getSeverityClass(bloat.estimatedBloat)}</span>
                        <h3 class="issue-title">Table: ${bloat.tableName}</h3>
                    </div>
                    <div class="issue-content">
                        <div class="issue-section">
                            <h4>🗑️ Wasted Space</h4>
                            <p>${bloat.wastedSpace} (${bloat.estimatedBloat.toFixed(1)}x bloat factor)</p>
                        </div>
                        <div class="issue-section">
                            <h4>💡 Recommendation</h4>
                            <p>${bloat.recommendation}</p>
                        </div>
                        <div class="before-after">
                            <div class="before">
                                <h4>📊 Before Optimization</h4>
                                <p><strong>Size:</strong> ${bloat.beforeOptimization.size}</p>
                                <p><strong>Performance:</strong> ${bloat.beforeOptimization.performance}</p>
                            </div>
                            <div class="after">
                                <h4>🚀 After Optimization</h4>
                                <p><strong>Size:</strong> ${bloat.afterOptimization.expectedSize}</p>
                                <p><strong>Performance:</strong> ${bloat.afterOptimization.expectedPerformance}</p>
                                <span class="improvement-badge">+${bloat.afterOptimization.improvementPercentage}% Improvement</span>
                            </div>
                        </div>
                        <div class="sql-code">-- Recommended fix for ${bloat.tableName}
VACUUM FULL ${bloat.tableName};
-- Or for minimal downtime:
-- pg_repack -t ${bloat.tableName} database_name</div>
                    </div>
                </div>
                `).join('')}
            </div>
            ` : ''}
            
            ${tableAnalysis.tablesWithoutPK.length > 0 ? `
            <h3><i class="fas fa-key"></i> Tables Without Primary Keys</h3>
            <div class="issue-grid">
                ${tableAnalysis.tablesWithoutPK.map((table: string) => `
                <div class="issue-card high">
                    <div class="issue-header">
                        <span class="severity-badge severity-high">HIGH</span>
                        <h3 class="issue-title">Table: ${table}</h3>
                    </div>
                    <div class="issue-content">
                        <div class="issue-section">
                            <h4>⚠️ Issue</h4>
                            <p>Table lacks a primary key, which can cause replication issues and performance problems.</p>
                        </div>
                        <div class="issue-section">
                            <h4>🔧 Solution</h4>
                            <p>Add a primary key constraint to ensure data integrity and improve performance.</p>
                        </div>
                        <div class="sql-code">-- Add primary key to ${table}
ALTER TABLE ${table} ADD COLUMN id SERIAL PRIMARY KEY;
-- Or if you have an existing unique column:
-- ALTER TABLE ${table} ADD PRIMARY KEY (existing_unique_column);</div>
                    </div>
                </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
    </div>`;
  }

  private generateSecurityAnalysisSection(securityAnalysis: any): string {
    return `
    <div class="section">
        <div class="section-header">
            <h2><i class="fas fa-shield-alt"></i> Security Analysis</h2>
        </div>
        <div class="section-content">
            <div style="margin-bottom: 15px; color: #555;">
                <strong>Why this matters:</strong> Security misconfigurations can expose sensitive data.
                We check RLS policies, PUBLIC privileges, and weak permissions to help you harden access.
            </div>
            ${securityAnalysis.vulnerabilities.length > 0 ? `
            <h3><i class="fas fa-exclamation-circle"></i> Security Vulnerabilities</h3>
            <div class="issue-grid">
                ${securityAnalysis.vulnerabilities.map((vuln: SecurityVulnerability) => `
                <div class="issue-card ${vuln.severity}">
                    <div class="issue-header">
                        <span class="severity-badge severity-${vuln.severity}">${vuln.severity.toUpperCase()}</span>
                        <h3 class="issue-title">${this.getVulnerabilityIcon(vuln.type)} ${vuln.description}</h3>
                    </div>
                    <div class="issue-content">
                        <div class="issue-section">
                            <h4>🎯 Affected Objects</h4>
                            <p>${vuln.affectedObjects.join(', ')}</p>
                        </div>
                        <div class="issue-section">
                            <h4>💥 Impact</h4>
                            <p>${vuln.impact}</p>
                        </div>
                        <div class="issue-section">
                            <h4>🔧 Solution</h4>
                            <p>${vuln.solution}</p>
                        </div>
                        <div class="issue-section">
                            <h4>🧠 Why this is a problem</h4>
                            <p>This vulnerability may allow unintended access or data modification.
                            Enforcing least privilege and RLS where needed reduces blast radius.</p>
                        </div>
                        <div class="issue-section">
                            <h4>🛠 How to improve</h4>
                            <p>Apply the SQL fix and then verify with a test user role that only expected rows are visible.</p>
                        </div>
                        ${vuln.solution.includes('ALTER TABLE') || vuln.solution.includes('REVOKE') ? `
                        <div class="sql-code">${vuln.solution}</div>
                        ` : ''}
                    </div>
                </div>
                `).join('')}
            </div>
            ` : '<p><i class="fas fa-check-circle" style="color: #28a745;"></i> No critical security vulnerabilities found.</p>'}
            
            ${securityAnalysis.rlsPolicies.length > 0 ? `
            <h3><i class="fas fa-users-cog"></i> Row Level Security Policies</h3>
            <div class="issue-grid">
                ${securityAnalysis.rlsPolicies.map((policy: any) => `
                <div class="issue-card ${policy.effectiveness === 'good' ? 'low' : 'medium'}">
                    <div class="issue-header">
                        <span class="severity-badge severity-${policy.effectiveness === 'good' ? 'low' : 'medium'}">
                            ${policy.effectiveness.toUpperCase()}
                        </span>
                        <h3 class="issue-title">${policy.table}.${policy.policy}</h3>
                    </div>
                    <div class="issue-content">
                        <div class="issue-section">
                            <h4>📋 Policy Details</h4>
                            <p><strong>Command:</strong> ${policy.command}</p>
                            <p><strong>Role:</strong> ${policy.role}</p>
                            <p><strong>Expression:</strong> ${policy.expression}</p>
                        </div>
                        ${policy.effectiveness !== 'good' ? `
                        <div class="issue-section">
                            <h4>💡 Recommendation</h4>
                            <p>Strengthen predicate to enforce user/tenant isolation; avoid expressions like <code>USING (true)</code>.
                            Use application settings (<code>current_setting</code>) to pass user context safely.</p>
                        </div>
                        ` : ''}
                    </div>
                </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
    </div>`;
  }

  private generatePerformanceIssuesSection(performanceIssues: any[]): string {
    if (performanceIssues.length === 0) {
      return `
      <div class="section">
          <div class="section-header">
              <h2><i class="fas fa-tachometer-alt"></i> Performance Analysis</h2>
          </div>
          <div class="section-content">
              <p><i class="fas fa-check-circle" style="color: #28a745;"></i> No critical performance issues detected.</p>
          </div>
      </div>`;
    }

    return `
    <div class="section">
        <div class="section-header">
            <h2><i class="fas fa-tachometer-alt"></i> Performance Issues</h2>
        </div>
        <div class="section-content">
            <div class="issue-grid">
                ${performanceIssues.map((issue: any) => `
                <div class="issue-card ${issue.severity}">
                    <div class="issue-header">
                        <span class="severity-badge severity-${issue.severity}">${issue.severity.toUpperCase()}</span>
                        <h3 class="issue-title">${this.getPerformanceIcon(issue.type)} ${issue.type.replace('_', ' ').toUpperCase()}</h3>
                    </div>
                    <div class="issue-content">
                        <div class="issue-section">
                            <h4>📋 Description</h4>
                            <p>${issue.description}</p>
                        </div>
                        <div class="issue-section">
                            <h4>💥 Impact</h4>
                            <p>${issue.impact}</p>
                        </div>
                        <div class="issue-section">
                            <h4>🔧 Solution</h4>
                            <p>${issue.solution}</p>
                        </div>
                        ${issue.estimatedImprovement ? `
                        <div class="issue-section">
                            <h4>📈 Expected Improvement</h4>
                            <p>${issue.estimatedImprovement}</p>
                        </div>
                        ` : ''}
                        ${issue.sqlFix ? `
                        <div class="sql-code">${issue.sqlFix}</div>
                        ` : ''}
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
    </div>`;
  }

  private generateOptimizationRecommendationsSection(recommendations: OptimizationRecommendation[]): string {
    if (recommendations.length === 0) {
      return '';
    }

    return `
    <div class="section">
        <div class="section-header">
            <h2><i class="fas fa-lightbulb"></i> Optimization Recommendations</h2>
        </div>
        <div class="section-content">
            <div class="recommendation-grid">
                ${recommendations.map((rec: OptimizationRecommendation, index: number) => `
                <div class="recommendation-card">
                    <div class="recommendation-title">
                        ${index + 1}. ${rec.title}
                        <span class="implementation-time">${rec.timeToImplement || 'Quick'}</span>
                        <span class="risk-indicator risk-${rec.riskLevel || 'low'}">${(rec.riskLevel || 'low').toUpperCase()} RISK</span>
                    </div>
                    <div class="issue-section">
                        <h4>📋 Description</h4>
                        <p>${rec.description}</p>
                    </div>
                    <div class="issue-section">
                        <h4>📈 Estimated Impact</h4>
                        <p>${rec.estimatedImpact}</p>
                    </div>
                    <div class="issue-section">
                        <h4>🔧 Implementation</h4>
                        <p>${rec.implementation}</p>
                    </div>
                    ${rec.sqlCommands && rec.sqlCommands.length > 0 ? `
                    <div class="sql-code">${rec.sqlCommands.join('\n')}</div>
                    ` : ''}
                </div>
                `).join('')}
            </div>
        </div>
    </div>`;
  }

  private generateAIInsightsSection(aiInsights: any): string {
    const strategic = this.getStrategicRecommendations((aiInsights as any).__report || ({} as any));
    const overall = this.sanitizeAIText(aiInsights.overallAssessment);
    const priority = this.normalizeToArray(aiInsights.priorityRecommendations);
    const risks = this.sanitizeAIText(aiInsights.riskAnalysis);
    const perf = this.sanitizeAIText(aiInsights.performancePredictions);
    const roadmap = this.normalizeToArray(aiInsights.implementationRoadmap);
    return `
    <div class="ai-insights">
        <h3><i class="fas fa-robot"></i> AI-Powered Insights</h3>
        
        <div class="insight-item">
            <h4>🎯 Overall Assessment</h4>
            <p>${overall}</p>
        </div>
        
        <div class="insight-item">
            <h4>⚡ Priority Recommendations</h4>
            <ul>
                ${priority.map((rec: string) => `<li>${rec}</li>`).join('')}
            </ul>
            ${priority.length ? `<div class="sql-code">${this.collectSqlFixes((aiInsights as any).__report || ({} as any)).join('\n') || ''}</div>` : ''}
        </div>
        
        <div class="insight-item">
            <h4>⚠️ Risk Analysis</h4>
            <p>${risks}</p>
        </div>
        
        <div class="insight-item">
            <h4>📊 Performance Predictions</h4>
            <p>${perf}</p>
        </div>
        
        <div class="insight-item">
            <h4>🗺️ Implementation Roadmap</h4>
            <div class="roadmap">
                ${roadmap.map((item: string, index: number) => `
                <div class="roadmap-item">
                    <div class="roadmap-week">Week ${index + 1}</div>
                    <div>${item}</div>
                </div>
                `).join('')}
            </div>
        </div>

        <div class="insight-item">
            <h4>🧱 Scalability & Architecture Tips</h4>
            <ul>
              ${strategic.length ? strategic.map(s => `<li>${s}</li>`).join('') : `
                <li>Partition large time-series/tenant tables.</li>
                <li>Adopt connection pooling and shorten transactions.</li>
                <li>Use GIN/GiST/partial indexes where appropriate.</li>
                <li>Automate VACUUM/ANALYZE; monitor autovacuum lag.</li>`}
            </ul>
        </div>
    </div>`;
  }

  private generateCostAnalysisSection(costAnalysis: any): string {
    return `
    <div class="section">
        <div class="section-header">
            <h2><i class="fas fa-dollar-sign"></i> Cost Analysis</h2>
        </div>
        <div class="section-content">
            <div class="dashboard">
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-hdd"></i></div>
                    <div class="metric-value">${costAnalysis.storageUsage.totalSize}</div>
                    <div class="metric-label">Total Storage</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-trash"></i></div>
                    <div class="metric-value">${costAnalysis.storageUsage.wastedSpace}</div>
                    <div class="metric-label">Wasted Space</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-piggy-bank"></i></div>
                    <div class="metric-value">$${costAnalysis.optimizationSavings.storage}</div>
                    <div class="metric-label">Storage Savings</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-calendar-alt"></i></div>
                    <div class="metric-value">$${costAnalysis.optimizationSavings.monthly}</div>
                    <div class="metric-label">Monthly Savings</div>
                </div>
            </div>
        </div>
    </div>`;
  }

  private getSeverityClass(value: number): string {
    if (value >= 3) return 'critical';
    if (value >= 2) return 'high';
    if (value >= 1.5) return 'medium';
    return 'low';
  }

  private getVulnerabilityIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'rls_disabled': '🔓',
      'public_access': '🌐',
      'weak_permissions': '🔐',
      'unencrypted_data': '🔒',
      'sql_injection_risk': '💉'
    };
    return icons[type] || '⚠️';
  }

  private getPerformanceIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'slow_query': '🐌',
      'table_bloat': '🗑️',
      'lock_contention': '🔒',
      'poor_statistics': '📊',
      'inefficient_triggers': '⚡'
    };
    return icons[type] || '⚡';
  }

  private generateQueryPerformanceSection(report: any): string {
    return `
    <div class="section">
        <div class="section-header">
            <h2><i class="fas fa-bolt"></i> Query Performance Analysis</h2>
        </div>
        <div class="section-content">
            <div class="dashboard">
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-clock"></i></div>
                    <div class="metric-value">${report.databaseInfo?.connectionInfo?.activeConnections}</div>
                    <div class="metric-label">Active Connections</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-database"></i></div>
                    <div class="metric-value">${report.databaseInfo?.connectionInfo?.maxConnections}</div>
                    <div class="metric-label">Max Connections</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-memory"></i></div>
                    <div class="metric-value">${report.databaseInfo?.settings?.sharedBuffers}</div>
                    <div class="metric-label">Shared Buffers</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-tachometer-alt"></i></div>
                    <div class="metric-value">${report.databaseInfo?.settings?.workMem}</div>
                    <div class="metric-label">Work Memory</div>
                </div>
            </div>
            
            <h3><i class="fas fa-chart-line"></i> Performance Insights</h3>
            <div class="issue-grid">
                <div class="issue-card low">
                    <div class="issue-header">
                        <span class="severity-badge severity-low">INFO</span>
                        <h3 class="issue-title">🔧 Connection Pool Usage</h3>
                    </div>
                    <div class="issue-content">
                        <p><strong>Current:</strong> ${((report.databaseInfo?.connectionInfo?.activeConnections) / (report.databaseInfo?.connectionInfo?.maxConnections) * 100).toFixed(1)}% of max connections used</p>
                        <p><strong>Recommendation:</strong> Monitor connection usage and consider pooling if above 80%</p>
                    </div>
                </div>
                
                <div class="issue-card medium">
                    <div class="issue-header">
                        <span class="severity-badge severity-medium">MEDIUM</span>
                        <h3 class="issue-title">💾 Memory Configuration</h3>
                    </div>
                    <div class="issue-content">
                        <p><strong>Current:</strong> Shared Buffers: ${report.databaseInfo?.settings?.sharedBuffers}</p>
                        <p><strong>Recommendation:</strong> Set shared_buffers to 25% of total RAM for optimal performance</p>
                        <div class="sql-code">-- Recommended configuration
ALTER SYSTEM SET shared_buffers = '2GB';  -- Adjust based on your RAM
ALTER SYSTEM SET effective_cache_size = '8GB';  -- 75% of RAM
SELECT pg_reload_conf();</div>
                    </div>
                </div>
                <div class="issue-card medium">
                    <div class="issue-header">
                        <span class="severity-badge severity-medium">MEDIUM</span>
                        <h3 class="issue-title">🪓 Sequential Scan Hotspots</h3>
                    </div>
                    <div class="issue-content">
                        <p>Focus on tables with high <em>seq_scan</em> to <em>idx_scan</em> ratios. Index frequently filtered columns and FKs.</p>
                        <p>Use the Missing Indexes section for candidate indexes.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
  }

  private generateConfigurationSection(databaseInfo: any): string {
    return `
    <div class="section">
        <div class="section-header">
            <h2><i class="fas fa-cogs"></i> Database Configuration Analysis</h2>
        </div>
        <div class="section-content">
            <div class="dashboard">
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-server"></i></div>
                    <div class="metric-value">${databaseInfo?.version?.split(' ')[1]}</div>
                    <div class="metric-label">PostgreSQL Version</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-hdd"></i></div>
                    <div class="metric-value">${databaseInfo?.size}</div>
                    <div class="metric-label">Database Size</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-shield-alt"></i></div>
                    <div class="metric-value">${databaseInfo?.settings?.enableRLS ? 'ON' : 'OFF'}</div>
                    <div class="metric-label">Row Level Security</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-chart-pie"></i></div>
                    <div class="metric-value">${databaseInfo?.settings?.randomPageCost || 4.0}</div>
                    <div class="metric-label">Random Page Cost</div>
                </div>
            </div>
            
            <h3><i class="fas fa-tools"></i> Configuration Recommendations</h3>
            <div class="recommendation-grid">
                <div class="recommendation-card">
                    <div class="recommendation-title">
                        🎯 Memory Optimization
                        <span class="implementation-time">5 minutes</span>
                        <span class="risk-indicator risk-low">LOW RISK</span>
                    </div>
                    <div class="issue-section">
                        <h4>Current Settings</h4>
                        <p>Shared Buffers: ${databaseInfo?.settings?.sharedBuffers}<br>
                        Work Mem: ${databaseInfo?.settings?.workMem}<br>
                        Maintenance Work Mem: ${databaseInfo?.settings?.maintenanceWorkMem}</p>
                    </div>
                    <div class="issue-section">
                        <h4>Recommendations</h4>
                        <p>Optimize memory settings based on your server's RAM for better performance</p>
                    </div>
                    <div class="sql-code">-- Memory optimization
ALTER SYSTEM SET shared_buffers = '25% of RAM';
ALTER SYSTEM SET effective_cache_size = '75% of RAM';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '256MB';
SELECT pg_reload_conf();</div>
                </div>
                
                <div class="recommendation-card">
                    <div class="recommendation-title">
                        🔒 Security Hardening
                        <span class="implementation-time">10 minutes</span>
                        <span class="risk-indicator risk-medium">MEDIUM RISK</span>
                    </div>
                    <div class="issue-section">
                        <h4>Security Status</h4>
                        <p>Row Level Security: ${databaseInfo?.settings?.enableRLS ? '✅ Enabled' : '❌ Disabled'}</p>
                    </div>
                    <div class="issue-section">
                        <h4>Recommendations</h4>
                        <p>Enable security features and configure proper access controls</p>
                    </div>
                    <div class="sql-code">-- Security hardening
ALTER SYSTEM SET log_statement = 'ddl';
ALTER SYSTEM SET log_min_duration_statement = 1000;
-- Enable RLS on sensitive tables
ALTER TABLE sensitive_table ENABLE ROW LEVEL SECURITY;</div>
                </div>
            </div>
        </div>
    </div>`;
  }

  private generateMaintenanceScheduleSection(recommendations: any[]): string {
    const maintenanceTasks = [
      { task: 'VACUUM ANALYZE', frequency: 'Daily', importance: 'High', description: 'Update statistics and reclaim space', command: 'VACUUM ANALYZE;' },
      { task: 'REINDEX', frequency: 'Weekly', importance: 'Medium', description: 'Rebuild indexes for optimal performance', command: 'REINDEX DATABASE;' },
      { task: 'Backup Verification', frequency: 'Daily', importance: 'Critical', description: 'Verify backup integrity', command: 'pg_verifybackup' },
      { task: 'Log Rotation', frequency: 'Weekly', importance: 'Medium', description: 'Archive and rotate log files', command: 'logrotate postgresql' },
      { task: 'Statistics Update', frequency: 'Daily', importance: 'High', description: 'Update query planner statistics', command: 'ANALYZE;' }
    ];

    return `
    <div class="section">
        <div class="section-header">
            <h2><i class="fas fa-calendar-alt"></i> Maintenance Schedule & Tasks</h2>
        </div>
        <div class="section-content">
            <h3><i class="fas fa-tasks"></i> Recommended Maintenance Tasks</h3>
            <div class="issue-grid">
                ${maintenanceTasks.map(task => `
                <div class="issue-card ${task.importance.toLowerCase()}">
                    <div class="issue-header">
                        <span class="severity-badge severity-${task.importance.toLowerCase()}">${task.importance.toUpperCase()}</span>
                        <h3 class="issue-title">🔧 ${task.task}</h3>
                    </div>
                    <div class="issue-content">
                        <div class="issue-section">
                            <h4>📅 Frequency</h4>
                            <p>${task.frequency}</p>
                        </div>
                        <div class="issue-section">
                            <h4>📋 Description</h4>
                            <p>${task.description}</p>
                        </div>
                        ${task.command ? `
                        <div class="issue-section">
                            <h4>💻 Command</h4>
                            <div class="sql-code">${task.command}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                `).join('')}
            </div>
            
            <h3><i class="fas fa-robot"></i> Automated Maintenance Script</h3>
            <div class="sql-code">#!/bin/bash
# PostgreSQL Maintenance Script
# Run this script daily via cron

echo "Starting PostgreSQL maintenance..."

# Update statistics
psql -d your_database -c "ANALYZE;"

# Vacuum analyze all tables
psql -d your_database -c "VACUUM ANALYZE;"

# Check for bloated tables
psql -d your_database -c "
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
LIMIT 10;"

# Log completion
echo "Maintenance completed at $(date)"</div>
        </div>
    </div>`;
  }

  private generateTrendsSection(report: any): string {
    return `
    <div class="section">
        <div class="section-header">
            <h2><i class="fas fa-chart-line"></i> Database Trends & Insights</h2>
        </div>
        <div class="section-content">
            <div class="dashboard">
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-trending-up"></i></div>
                    <div class="metric-value">${report.schemaHealth?.overall >= 8 ? 'Excellent' : report.schemaHealth?.overall >= 6 ? 'Good' : 'Needs Attention'}</div>
                    <div class="metric-label">Health Trend</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-lightbulb"></i></div>
                    <div class="metric-value">${report.optimizationRecommendations?.length}</div>
                    <div class="metric-label">Optimization Opportunities</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-shield-alt"></i></div>
                    <div class="metric-value">${report.securityAnalysis?.vulnerabilities?.length === 0 ? 'Secure' : 'At Risk'}</div>
                    <div class="metric-label">Security Status</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-icon"><i class="fas fa-clock"></i></div>
                    <div class="metric-value">${new Date().toLocaleDateString()}</div>
                    <div class="metric-label">Last Analysis</div>
                </div>
            </div>
            
            <h3><i class="fas fa-brain"></i> Key Insights</h3>
            <div class="insight-item">
                <h4>🎯 Performance Insights</h4>
                <p><strong>Database Health Score:</strong> ${report.schemaHealth?.overall}/10</p>
                <p><strong>Index Efficiency:</strong> ${report.schemaHealth?.indexEfficiency}/10</p>
                <p><strong>Security Score:</strong> ${report.schemaHealth?.security}/10</p>
                <p><strong>Overall Assessment:</strong> ${this.generateOverallAssessment(report)}</p>
            </div>
            
            <div class="insight-item">
                <h4>📊 Growth Projections</h4>
                <p><strong>Current Size:</strong> ${report.databaseInfo?.size}</p>
                <p><strong>Table Count:</strong> ${report.databaseInfo?.tableCount} tables</p>
                <p><strong>Index Count:</strong> ${report.databaseInfo?.indexCount} indexes</p>
                <p><strong>Estimated Monthly Growth:</strong> Based on current usage patterns, expect 5-10% growth</p>
            </div>
            
            <div class="insight-item">
                <h4>🚀 Next Steps</h4>
                <div class="roadmap">
                    <div class="roadmap-item">
                        <div class="roadmap-week">Week 1</div>
                        <div>Address critical security vulnerabilities</div>
                    </div>
                    <div class="roadmap-item">
                        <div class="roadmap-week">Week 2</div>
                        <div>Optimize high-impact performance issues</div>
                    </div>
                    <div class="roadmap-item">
                        <div class="roadmap-week">Week 3</div>
                        <div>Implement recommended indexes</div>
                    </div>
                    <div class="roadmap-item">
                        <div class="roadmap-week">Week 4</div>
                        <div>Set up automated maintenance tasks</div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
  }

  private generateOverallAssessment(report: any): string {
    const score = report.schemaHealth?.overall || 0;
    if (score >= 9) return "🌟 Excellent! Your database is well-optimized and secure.";
    if (score >= 7) return "✅ Good! Minor optimizations recommended.";
    if (score >= 5) return "⚠️ Moderate issues found. Consider implementing recommendations.";
    return "🚨 Critical issues detected. Immediate attention required.";
  }

  private getScoreDescription(score: number): string {
    if (score >= 9) return "Excellent";
    if (score >= 8) return "Very Good";
    if (score >= 7) return "Good";
    if (score >= 6) return "Fair";
    if (score >= 5) return "Below Average";
    if (score >= 4) return "Poor";
    return "Critical";
  }

  private getNormalizationDescription(score: number): string {
    if (score >= 9) return "Highly normalized with excellent data organization";
    if (score >= 8) return "Well normalized with good data structure";
    if (score >= 7) return "Adequately normalized with minor improvements needed";
    if (score >= 6) return "Moderately normalized with some redundancy";
    if (score >= 5) return "Basic normalization with significant redundancy";
    if (score >= 4) return "Poor normalization with data integrity risks";
    return "Critical normalization issues requiring immediate attention";
  }

  private getFKDescription(score: number): string {
    if (score >= 9) return "Excellent referential integrity with proper constraints";
    if (score >= 8) return "Good foreign key implementation with minor gaps";
    if (score >= 7) return "Adequate constraints with some missing relationships";
    if (score >= 6) return "Basic foreign keys with several missing constraints";
    if (score >= 5) return "Limited foreign key usage with integrity risks";
    if (score >= 4) return "Poor referential integrity with many orphaned records";
    return "Critical integrity issues with widespread data inconsistency";
  }

  private getNamingDescription(score: number): string {
    if (score >= 9) return "Consistent, clear naming following all best practices";
    if (score >= 8) return "Good naming conventions with minor inconsistencies";
    if (score >= 7) return "Generally consistent naming with some improvements needed";
    if (score >= 6) return "Mixed naming patterns with moderate inconsistencies";
    if (score >= 5) return "Inconsistent naming affecting code readability";
    if (score >= 4) return "Poor naming conventions hampering maintenance";
    return "Critical naming issues severely impacting usability";
  }

  private generateDetailedRecommendationsGrid(recommendations: any[]): string {
    if (!recommendations || recommendations.length === 0) {
      return `
      <div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); border-radius: 10px; border-left: 4px solid #28a745;">
        <h3 style="color: #155724; margin-bottom: 15px;"><i class="fas fa-check-circle"></i> Schema Health Status</h3>
        <p style="color: #155724;">🎉 Congratulations! Your database schema appears to be well-designed and follows most best practices. Continue monitoring for any changes that might affect schema health.</p>
      </div>`;
    }

    return `
    <div style="margin-top: 30px;">
      <h3><i class="fas fa-tools"></i> Detailed Schema Recommendations</h3>
      <div class="recommendation-grid" style="display: grid; gap: 20px; margin-top: 20px;">
        ${recommendations.slice(0, 5).map((rec, index) => `
        <div class="recommendation-card" style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); border-left: 5px solid ${this.getRecommendationColor(rec.priority)};">
          <div class="recommendation-header" style="display: flex; justify-content: between; align-items: center; margin-bottom: 20px;">
            <h4 style="color: ${this.getRecommendationColor(rec.priority)}; margin: 0; font-size: 1.1em;">
              ${this.getRecommendationIcon(rec.type)} ${rec.title || `Schema Recommendation ${index + 1}`}
            </h4>
            <div style="display: flex; gap: 10px;">
              <span class="priority-badge" style="background: ${this.getRecommendationColor(rec.priority)}; color: white; padding: 4px 12px; border-radius: 15px; font-size: 0.8em; font-weight: bold;">
                ${rec.priority?.toUpperCase() || 'MEDIUM'}
              </span>
              <span class="effort-badge" style="background: #6c757d; color: white; padding: 4px 12px; border-radius: 15px; font-size: 0.8em;">
                ${this.getEffortEstimate(rec.effort)}
              </span>
            </div>
          </div>
          
          <div class="recommendation-content" style="margin-bottom: 20px;">
            <div style="margin-bottom: 15px;">
              <h5 style="color: #333; margin-bottom: 10px;"><i class="fas fa-exclamation-circle"></i> Issue Description</h5>
              <p style="color: #666; line-height: 1.6;">${rec.description || 'Schema optimization opportunity identified.'}</p>
            </div>
            
            <div style="margin-bottom: 15px;">
              <h5 style="color: #333; margin-bottom: 10px;"><i class="fas fa-lightbulb"></i> Why This Matters</h5>
              <p style="color: #666; line-height: 1.6;">${rec.impact || 'This optimization will improve database performance, maintainability, and reliability.'}</p>
            </div>
            
            <div style="margin-bottom: 15px;">
              <h5 style="color: #333; margin-bottom: 10px;"><i class="fas fa-wrench"></i> Recommended Solution</h5>
              <p style="color: #666; line-height: 1.6;">${rec.fix || rec.solution || 'Follow database best practices to resolve this issue.'}</p>
            </div>
            
            ${rec.sql || rec.code ? `
            <div style="margin-bottom: 15px;">
              <h5 style="color: #333; margin-bottom: 10px;"><i class="fas fa-code"></i> Implementation Code</h5>
              <div class="sql-code" style="background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 0.9em; overflow-x: auto;">
${rec.sql || rec.code}
              </div>
            </div>
            ` : ''}
            
            <div>
              <h5 style="color: #333; margin-bottom: 10px;"><i class="fas fa-chart-line"></i> Expected Improvement</h5>
              <p style="color: #666; line-height: 1.6;">${rec.improvement || rec.benefit || 'This change will result in better performance, improved data integrity, and easier maintenance.'}</p>
            </div>
          </div>
          
          <div class="recommendation-footer" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding-top: 15px; border-top: 1px solid #e9ecef;">
            <div>
              <small style="color: #666; font-weight: bold;">Risk Level:</small><br>
              <span style="color: ${this.getRiskColor(rec.risk)}; font-weight: bold;">
                ${this.getRiskIcon(rec.risk)} ${rec.risk?.toUpperCase() || 'LOW'}
              </span>
            </div>
            <div>
              <small style="color: #666; font-weight: bold;">Implementation Time:</small><br>
              <span style="color: #333; font-weight: bold;">
                <i class="fas fa-clock"></i> ${this.getTimeEstimate(rec.effort)}
              </span>
            </div>
          </div>
        </div>
        `).join('')}
      </div>
    </div>`;
  }

  private getRecommendationColor(priority: string): string {
    switch (priority?.toLowerCase()) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  }

  private getRecommendationIcon(type: string): string {
    switch (type?.toLowerCase()) {
      case 'index': return '🔍';
      case 'foreign_key': return '🔗';
      case 'normalization': return '📊';
      case 'naming': return '🏷️';
      case 'security': return '🔒';
      case 'performance': return '⚡';
      default: return '🔧';
    }
  }

  private getEffortEstimate(effort: string): string {
    switch (effort?.toLowerCase()) {
      case 'low': return 'Low Effort';
      case 'medium': return 'Medium Effort';
      case 'high': return 'High Effort';
      default: return 'Medium Effort';
    }
  }

  private getRiskColor(risk: string): string {
    switch (risk?.toLowerCase()) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#28a745';
    }
  }

  private getRiskIcon(risk: string): string {
    switch (risk?.toLowerCase()) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return '✅';
      default: return '✅';
    }
  }

  private getTimeEstimate(effort: string): string {
    switch (effort?.toLowerCase()) {
      case 'low': return '15-30 minutes';
      case 'medium': return '1-2 hours';
      case 'high': return '4-8 hours';
      default: return '1-2 hours';
    }
  }

  private getTableNamesFromReport(report: EnhancedDatabaseHealthReport): string[] {
    // Get table names from various sources in the report
    return [
      ...(report.tableAnalysis?.tablesWithoutPK || []),
      ...(report.tableAnalysis?.tablesWithBloat?.map((t: any) => t.tableName) || []),
      ...(report.tableAnalysis?.largeTables?.map((t: any) => t.name) || []),
      ...(report.securityAnalysis?.permissions?.publicAccess || [])
    ].filter((name, index, self) => self.indexOf(name) === index); // Remove duplicates
  }

  private generateRealForeignKeyExample(report: EnhancedDatabaseHealthReport): string {
    const tableNames = this.getTableNamesFromReport(report);

    if (tableNames.length < 2) {
      return '-- No sufficient tables found for foreign key examples\n-- Add more tables to your database to see real examples';
    }

    // Find a table that could logically be a parent (shorter name or contains 'user', 'institution', etc.)
    const parentTable = tableNames.find(name => name.includes('institution') || name.includes('user')) || tableNames[0];
    const childTable = tableNames.find(name => name !== parentTable) || tableNames[1];

    return `-- Create parent table first
-- Based on your existing table: ${parentTable}
CREATE TABLE ${parentTable} (
    id SERIAL PRIMARY KEY,
    -- Add your columns based on actual schema
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create child table with proper foreign key
-- Based on your existing table: ${childTable}
CREATE TABLE ${childTable} (
    id SERIAL PRIMARY KEY,
    ${parentTable}_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Define foreign key constraint with proper actions
    CONSTRAINT fk_${childTable}_${parentTable}
        FOREIGN KEY (${parentTable}_id) 
        REFERENCES ${parentTable}(id) 
        ON DELETE RESTRICT    -- Prevent deletion if references exist
        ON UPDATE CASCADE     -- Update references if parent ID changes
);

-- Add helpful indexes for performance
CREATE INDEX idx_${childTable}_${parentTable}_id ON ${childTable}(${parentTable}_id);`;
  }

  private generateRealConstraintExample(report: EnhancedDatabaseHealthReport): string {
    const tableNames = this.getTableNamesFromReport(report);

    if (tableNames.length < 2) {
      return '-- No sufficient tables found for constraint examples';
    }

    const childTable = tableNames.find(name => name.includes('user_') || name.includes('education')) || tableNames[0];
    const parentTable = tableNames.find(name => name !== childTable && (name.includes('institution') || name.includes('user'))) || tableNames[1];

    return `-- Add missing foreign key constraint for your tables
ALTER TABLE ${childTable} 
ADD CONSTRAINT fk_${childTable}_${parentTable}
FOREIGN KEY (${parentTable}_id) REFERENCES ${parentTable}(id);`;
  }

  private generateRealOrphanedRecordsExample(report: EnhancedDatabaseHealthReport): string {
    const tableNames = this.getTableNamesFromReport(report);

    if (tableNames.length < 2) {
      return '-- No sufficient tables found for orphaned records examples';
    }

    const childTable = tableNames.find(name => name.includes('user_') || name.includes('education')) || tableNames[0];
    const parentTable = tableNames.find(name => name !== childTable) || tableNames[1];

    return `-- Find orphaned records in your tables
SELECT c.id, c.${parentTable}_id
FROM ${childTable} c 
LEFT JOIN ${parentTable} p ON c.${parentTable}_id = p.id 
WHERE p.id IS NULL;

-- Clean up orphaned records
DELETE FROM ${childTable} 
WHERE ${parentTable}_id NOT IN (SELECT id FROM ${parentTable});`;
  }

  private generateRealNormalizationExample(report: EnhancedDatabaseHealthReport): string {
    const tableNames = this.getTableNamesFromReport(report);

    if (tableNames.length === 0) {
      return '-- No tables found for normalization examples';
    }

    const table = tableNames.find(name => name.includes('user') || name.includes('institution')) || tableNames[0];
    
    return `-- Example based on your table: ${table}
-- 1NF: Atomic values, no repeating groups
CREATE TABLE ${table} (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2NF: Remove partial dependencies
-- 3NF: Remove transitive dependencies
-- Proper normalization for ${table}`;
  }

  private generateRealIndexExample(report: EnhancedDatabaseHealthReport): string {
    // Get table names from various sources in the report
    const tableNames = [
      ...(report.tableAnalysis?.tablesWithoutPK || []),
      ...(report.tableAnalysis?.tablesWithBloat?.map((t: any) => t.tableName) || []),
      ...(report.tableAnalysis?.largeTables?.map((t: any) => t.name) || []),
      ...(report.securityAnalysis?.permissions?.publicAccess || [])
    ].filter((name, index, self) => self.indexOf(name) === index);

    if (tableNames.length === 0) {
      return '-- No tables found for index examples';
    }

    const table = tableNames[0];
    
    return `-- ✅ Well-named indexes for your table: ${table}
CREATE INDEX idx_${table}_created_at ON ${table}(created_at);
CREATE INDEX idx_${table}_name ON ${table}(name);

-- ✅ Well-named unique constraints
CREATE UNIQUE INDEX uk_${table}_id ON ${table}(id);

-- For queries like:
SELECT * FROM ${table} WHERE created_at > '2024-01-01';`;
  }

  private getSecurityScore(securityAnalysis: any): number {
    const vulnerabilities = securityAnalysis.vulnerabilities?.length ?? 0;
    const rlsPolicies = securityAnalysis.rlsPolicies?.length ?? 0;
    const publicTables = securityAnalysis.publicTables ?? 0;
    
    let score = 10;
    score -= vulnerabilities * 2; // -2 points per vulnerability
    if (rlsPolicies === 0 && publicTables > 0) score -= 2; // No RLS on public tables
    if (publicTables > 5) score -= 1; // Too many public tables
    
    return Math.max(0, Math.min(10, score));
  }

  private getSecurityDescription(score: number): string {
    if (score >= 9) return "Excellent Security";
    if (score >= 8) return "Very Secure";
    if (score >= 7) return "Good Security";
    if (score >= 6) return "Adequate Security";
    if (score >= 5) return "Needs Improvement";
    return "Critical Issues";
  }

  private getVulnerabilityConsequences(type: string): string[] {
    switch (type?.toLowerCase()) {
      case 'missing_rls':
        return [
          'Unauthorized access to sensitive data',
          'Data privacy violations',
          'Compliance violations (GDPR, HIPAA)',
          'Cross-tenant data leakage'
        ];
      case 'excessive_permissions':
        return [
          'Privilege escalation attacks',
          'Unauthorized data modification',
          'Accidental data deletion',
          'Internal security breaches'
        ];
      case 'public_access':
        return [
          'Data exposure to unauthorized users',
          'Potential data breaches',
          'Compliance violations',
          'Reputational damage'
        ];
      default:
        return [
          'Potential security breach',
          'Data integrity issues',
          'Compliance violations',
          'System compromise'
        ];
    }
  }

  private getImplementationSteps(type: string, table: string): string[] {
    switch (type?.toLowerCase()) {
      case 'missing_rls':
        return [
          `Enable RLS on table: ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,
          'Identify user context (user_id, tenant_id, role)',
          'Create appropriate policies for different user types',
          'Test policies with different user contexts',
          'Monitor and audit policy effectiveness'
        ];
      case 'excessive_permissions':
        return [
          'Audit current user permissions and roles',
          'Identify minimum required permissions for each role',
          'Revoke unnecessary permissions',
          'Create new restricted roles if needed',
          'Update application connection strings to use restricted roles'
        ];
      case 'public_access':
        return [
          'Review if public access is actually needed',
          'Create specific roles for external access',
          'Implement proper authentication mechanisms',
          'Add audit logging for public table access',
          'Consider using views with restricted columns'
        ];
      default:
        return [
          'Assess the security risk',
          'Design appropriate security controls',
          'Implement the security measures',
          'Test the implementation',
          'Monitor and maintain security'
        ];
    }
  }

  private generateSecurityFixCode(vuln: any): string {
    switch (vuln.type?.toLowerCase()) {
      case 'missing_rls':
        return `-- Enable Row Level Security on ${vuln.affectedObjects[0]}
ALTER TABLE ${vuln.affectedObjects[0]} ENABLE ROW LEVEL SECURITY;

-- Create user isolation policy
CREATE POLICY user_isolation_policy ON ${vuln.affectedObjects[0]}
    FOR ALL TO authenticated_users
    USING (user_id = current_setting('app.user_id')::integer);

-- Create admin bypass policy
CREATE POLICY admin_access_policy ON ${vuln.affectedObjects[0]}
    FOR ALL TO admin_users
    USING (true);`;
      case 'excessive_permissions':
        return `-- Revoke excessive permissions
REVOKE ALL ON ${vuln.affectedObjects[0]} FROM public;

-- Grant only necessary permissions
GRANT SELECT, INSERT, UPDATE ON ${vuln.affectedObjects[0]} TO app_user_role;
GRANT ALL ON ${vuln.affectedObjects[0]} TO admin_role;`;
      case 'public_access':
        return `-- Remove public access
REVOKE ALL ON ${vuln.affectedObjects[0]} FROM public;

-- Create restricted access role
CREATE ROLE external_api_role;
GRANT SELECT ON ${vuln.affectedObjects[0]} TO external_api_role;

-- Consider using a view for public access
CREATE VIEW ${vuln.affectedObjects[0]}_public AS 
SELECT id, name, public_info FROM ${vuln.affectedObjects[0]} 
WHERE is_public = true;

GRANT SELECT ON ${vuln.affectedObjects[0]}_public TO public;`;
      default:
        return vuln.solution || '-- Implement appropriate security measures';
    }
  }

  private getRLSEffectivenessDescription(effectiveness: string): string {
    switch (effectiveness?.toLowerCase()) {
      case 'excellent': return 'Highly effective with comprehensive coverage';
      case 'good': return 'Well-configured with good security coverage';
      case 'moderate': return 'Provides basic security but could be improved';
      case 'poor': return 'Limited effectiveness, needs significant improvement';
      case 'none': return 'No meaningful security provided';
      default: return 'Effectiveness assessment needed';
    }
  }

  private getRLSSecurityLevel(policy: any): string {
    if (policy.expression?.includes('true')) return 'Full Access (Admin-level)';
    if (policy.expression?.includes('user_id')) return 'User Isolation';
    if (policy.expression?.includes('tenant_id')) return 'Tenant Isolation';
    if (policy.expression?.includes('role')) return 'Role-based Access';
    return 'Custom Logic';
  }

  private explainRLSPolicy(policy: any): string {
    const command = policy.command?.toUpperCase();
    const role = policy.role;
    const expression = policy.expression;

    if (expression?.includes('true')) {
      return `Grants ${command} access to all rows for role '${role}'. This is typically used for administrative access.`;
    }
    if (expression?.includes('user_id')) {
      return `Restricts ${command} access to rows where the user_id matches the current user. This ensures users can only access their own data.`;
    }
    if (expression?.includes('tenant_id')) {
      return `Implements multi-tenant isolation by restricting ${command} access to rows matching the current tenant. Essential for SaaS applications.`;
    }
    return `Custom ${command} policy for role '${role}' with expression: ${expression}`;
  }

  private getRLSImprovementSuggestions(policy: any): string {
    if (policy.effectiveness === 'poor') {
      return 'This policy may be too permissive or have logical flaws. Consider making the expression more restrictive and adding additional conditions for better security.';
    }
    if (policy.effectiveness === 'moderate') {
      return 'This policy provides basic security but could benefit from additional conditions, better context validation, or more specific role targeting.';
    }
    return 'Consider adding additional validation, audit logging, or more granular conditions to enhance security.';
  }

  private generateImprovedRLSPolicy(policy: any): string {
    const table = policy.table;
    const role = policy.role;
    
    return `-- Enhanced policy with better security
CREATE POLICY enhanced_${policy.policy} ON ${table}
    FOR ALL TO ${role}
    USING (
        user_id = current_setting('app.user_id')::integer 
        AND is_active = true 
        AND (
            tenant_id = current_setting('app.tenant_id')::integer 
            OR current_setting('app.user_role') = 'admin'
        )
    );`;
  }

  private generateReportId(): string {
    return Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  /**
   * Generate CLI report with enhanced formatting
   */
  generateEnhancedCLIReport(report: EnhancedDatabaseHealthReport): string {
    let output = '';
    
    // Header
    output += chalk.bold.blue('\n🔍 ENHANCED DATABASE HEALTH AUDIT REPORT\n');
    output += chalk.gray('='.repeat(60)) + '\n';
    output += chalk.white(`📅 Generated: ${new Date().toLocaleString()}\n`);
    output += chalk.white(`🗄️  Database: ${report.databaseInfo.version.split(' ')[0]}\n`);
    output += chalk.white(`📊 Size: ${report.databaseInfo.size}\n\n`);

    // Executive Summary
    output += chalk.bold.yellow('📋 EXECUTIVE SUMMARY\n');
    output += chalk.gray('-'.repeat(30)) + '\n';
    output += `Overall Health Score: ${this.getColoredScore(report.schemaHealth.overall)}/10\n`;
    output += `Tables: ${chalk.cyan(report.databaseInfo.tableCount)}\n`;
    output += `Security Issues: ${this.getColoredCount(report.securityAnalysis.vulnerabilities.length)}\n`;
    output += `Performance Issues: ${this.getColoredCount(report.performanceIssues.length)}\n`;
    output += `Monthly Savings Potential: ${chalk.green('$' + report.costAnalysis.optimizationSavings.monthly.toFixed(0))}\n\n`;

    // Security Analysis
    if (report.securityAnalysis.vulnerabilities.length > 0) {
      output += chalk.bold.red('🔒 SECURITY VULNERABILITIES\n');
      output += chalk.gray('-'.repeat(30)) + '\n';
      report.securityAnalysis.vulnerabilities.forEach((vuln, index) => {
        output += chalk.red(`${index + 1}. ${vuln.description}\n`);
        output += `   Severity: ${this.getColoredSeverity(vuln.severity)}\n`;
        output += `   Impact: ${vuln.impact}\n`;
        output += `   Solution: ${vuln.solution}\n\n`;
      });
    }

    // Performance Issues
    if (report.performanceIssues.length > 0) {
      output += chalk.bold.yellow('⚡ PERFORMANCE ISSUES\n');
      output += chalk.gray('-'.repeat(30)) + '\n';
      report.performanceIssues.forEach((issue, index) => {
        output += chalk.yellow(`${index + 1}. ${issue.description}\n`);
        output += `   Severity: ${this.getColoredSeverity(issue.severity)}\n`;
        output += `   Impact: ${issue.impact}\n`;
        output += `   Solution: ${issue.solution}\n\n`;
      });
    }

    // AI Insights
    if (report.aiInsights) {
      output += chalk.bold.magenta('🤖 AI INSIGHTS\n');
      output += chalk.gray('-'.repeat(30)) + '\n';
      output += chalk.white(`${report.aiInsights.overallAssessment}\n\n`);
      
      output += chalk.bold('Priority Recommendations:\n');
      report.aiInsights.priorityRecommendations.forEach((rec, index) => {
        output += chalk.cyan(`  ${index + 1}. ${rec}\n`);
      });
      output += '\n';
    }

    return output;
  }

  private getColoredScore(score: number): string {
    if (score >= 8) return chalk.green(score.toFixed(1));
    if (score >= 6) return chalk.yellow(score.toFixed(1));
    return chalk.red(score.toFixed(1));
  }

  private getColoredCount(count: number): string {
    if (count === 0) return chalk.green(count.toString());
    if (count <= 3) return chalk.yellow(count.toString());
    return chalk.red(count.toString());
  }

  private getColoredSeverity(severity: string): string {
    switch (severity) {
      case 'critical': return chalk.red.bold(severity.toUpperCase());
      case 'high': return chalk.red(severity.toUpperCase());
      case 'medium': return chalk.yellow(severity.toUpperCase());
      case 'low': return chalk.green(severity.toUpperCase());
      default: return chalk.white(severity.toUpperCase());
    }
  }
}