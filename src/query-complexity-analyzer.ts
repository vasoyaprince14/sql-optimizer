import { AnalysisResult } from './types';

export interface ComplexityMetrics {
  complexityScore: number;
  readabilityScore: number;
  maintainabilityScore: number;
  riskFactors: string[];
  suggestions: string[];
}

export class QueryComplexityAnalyzer {
  /**
   * Analyze query complexity and provide insights
   */
  analyzeComplexity(result: AnalysisResult): ComplexityMetrics {
    const query = result.query.toLowerCase();
    const complexityFactors: string[] = [];
    const riskFactors: string[] = [];
    const suggestions: string[] = [];
    
    let complexityScore = 0;
    let readabilityScore = 10;
    let maintainabilityScore = 10;
    
    // Analyze query length
    if (query.length > 500) {
      complexityScore += 3;
      complexityFactors.push('Long query (>500 chars)');
      suggestions.push('Consider breaking into smaller queries or using CTEs');
    }
    
    // Analyze number of JOINs
    const joinCount = (query.match(/join/g) || []).length;
    if (joinCount > 3) {
      complexityScore += 2;
      complexityFactors.push(`Multiple JOINs (${joinCount})`);
      suggestions.push('Consider if all JOINs are necessary or if you can use subqueries');
    }
    
    // Analyze subqueries
    const subqueryCount = (query.match(/\(/g) || []).length - (query.match(/\)/g) || []).length;
    if (subqueryCount > 0) {
      complexityScore += 2;
      complexityFactors.push('Contains subqueries');
      suggestions.push('Consider using CTEs for better readability');
    }
    
    // Analyze window functions
    if (query.includes('over(')) {
      complexityScore += 1;
      complexityFactors.push('Uses window functions');
    }
    
    // Analyze aggregations
    if (query.includes('group by') || query.includes('having')) {
      complexityScore += 1;
      complexityFactors.push('Uses aggregations');
    }
    
    // Analyze UNION/INTERSECT/EXCEPT
    if (query.includes('union') || query.includes('intersect') || query.includes('except')) {
      complexityScore += 2;
      complexityFactors.push('Uses set operations');
    }
    
    // Risk factors
    if (query.includes('select *')) {
      riskFactors.push('SELECT * - may return unnecessary columns');
      suggestions.push('Specify only needed columns');
    }
    
    if (query.includes('distinct')) {
      riskFactors.push('DISTINCT - may indicate data quality issues');
      suggestions.push('Check if DISTINCT is necessary or if there are duplicate data issues');
    }
    
    if (query.includes('like \'%') || query.includes('like "%')) {
      riskFactors.push('Leading wildcard in LIKE - cannot use indexes');
      suggestions.push('Consider full-text search or different approach');
    }
    
    if (query.includes('order by') && !query.includes('limit')) {
      riskFactors.push('ORDER BY without LIMIT - may return large result sets');
      suggestions.push('Add LIMIT clause');
    }
    
    // Calculate scores
    complexityScore = Math.min(complexityScore, 10);
    readabilityScore = Math.max(readabilityScore - complexityScore, 1);
    maintainabilityScore = Math.max(maintainabilityScore - Math.floor(complexityScore / 2), 1);
    
    return {
      complexityScore,
      readabilityScore,
      maintainabilityScore,
      riskFactors,
      suggestions
    };
  }
  
  /**
   * Generate complexity report
   */
  generateComplexityReport(result: AnalysisResult): string {
    const complexity = this.analyzeComplexity(result);
    
    let report = '\n🔍 Query Complexity Analysis\n';
    report += '═══════════════════════════════════════════════════════════════\n\n';
    
    report += `📊 Complexity Score: ${complexity.complexityScore}/10\n`;
    report += `📖 Readability Score: ${complexity.readabilityScore}/10\n`;
    report += `🔧 Maintainability Score: ${complexity.maintainabilityScore}/10\n\n`;
    
    if (complexity.riskFactors.length > 0) {
      report += '⚠️  Risk Factors:\n';
      complexity.riskFactors.forEach(factor => {
        report += `  • ${factor}\n`;
      });
      report += '\n';
    }
    
    if (complexity.suggestions.length > 0) {
      report += '💡 Complexity Suggestions:\n';
      complexity.suggestions.forEach(suggestion => {
        report += `  • ${suggestion}\n`;
      });
      report += '\n';
    }
    
    return report;
  }
} 