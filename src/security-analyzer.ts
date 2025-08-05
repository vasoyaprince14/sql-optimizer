import { AnalysisResult } from './types';

export interface SecurityAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  vulnerabilities: string[];
  recommendations: string[];
  securityScore: number;
}

export class SecurityAnalyzer {
  /**
   * Analyze query for security vulnerabilities
   */
  analyzeSecurity(result: AnalysisResult): SecurityAnalysis {
    const { query } = result;
    const vulnerabilities: string[] = [];
    const recommendations: string[] = [];
    
    let securityScore = 100; // Start with perfect score
    
    // Check for potential SQL injection patterns
    const injectionPatterns = [
      /'.*\+.*'/i, // String concatenation
      /'.*%.*'/i,  // LIKE with user input
      /'.*--/i,    // SQL comments
      /'.*;.*'/i,  // Multiple statements
      /'.*union.*'/i, // UNION attacks
      /'.*drop.*'/i,  // DROP statements
      /'.*delete.*'/i, // DELETE statements
      /'.*update.*'/i, // UPDATE statements
      /'.*insert.*'/i, // INSERT statements
    ];
    
    injectionPatterns.forEach(pattern => {
      if (pattern.test(query)) {
        vulnerabilities.push('Potential SQL injection pattern detected');
        securityScore -= 30;
        recommendations.push('Use parameterized queries or prepared statements');
      }
    });
    
    // Check for dynamic SQL
    if (query.includes('EXEC') || query.includes('EXECUTE')) {
      vulnerabilities.push('Dynamic SQL execution detected');
      securityScore -= 25;
      recommendations.push('Avoid dynamic SQL when possible');
    }
    
    // Check for excessive privileges
    if (query.toLowerCase().includes('grant') || query.toLowerCase().includes('revoke')) {
      vulnerabilities.push('Privilege management detected');
      securityScore -= 20;
      recommendations.push('Review privilege requirements');
    }
    
    // Check for data exposure
    if (query.toLowerCase().includes('password') || query.toLowerCase().includes('secret')) {
      vulnerabilities.push('Sensitive data access detected');
      securityScore -= 15;
      recommendations.push('Ensure sensitive data is properly protected');
    }
    
    // Check for large result sets
    if (result.performance.rowsReturned > 10000) {
      vulnerabilities.push('Large result set may expose too much data');
      securityScore -= 10;
      recommendations.push('Add appropriate WHERE clauses and LIMIT');
    }
    
    // Check for missing WHERE clauses
    if (!query.toLowerCase().includes('where') && query.toLowerCase().includes('select')) {
      vulnerabilities.push('No WHERE clause - may expose all data');
      securityScore -= 15;
      recommendations.push('Add appropriate WHERE clauses');
    }
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (securityScore >= 80) riskLevel = 'low';
    else if (securityScore >= 60) riskLevel = 'medium';
    else if (securityScore >= 40) riskLevel = 'high';
    else riskLevel = 'critical';
    
    return {
      riskLevel,
      vulnerabilities,
      recommendations,
      securityScore: Math.max(securityScore, 0)
    };
  }
  
  /**
   * Generate security report
   */
  generateSecurityReport(result: AnalysisResult): string {
    const security = this.analyzeSecurity(result);
    
    let report = '\n🔒 Security Analysis\n';
    report += '═══════════════════════════════════════════════════════════════\n\n';
    
    report += `🛡️  Security Score: ${security.securityScore}/100\n`;
    report += `⚠️  Risk Level: ${security.riskLevel.toUpperCase()}\n\n`;
    
    if (security.vulnerabilities.length > 0) {
      report += '🚨 Security Vulnerabilities:\n';
      security.vulnerabilities.forEach(vuln => {
        report += `  • ${vuln}\n`;
      });
      report += '\n';
    }
    
    if (security.recommendations.length > 0) {
      report += '💡 Security Recommendations:\n';
      security.recommendations.forEach(rec => {
        report += `  • ${rec}\n`;
      });
      report += '\n';
    }
    
    return report;
  }
} 