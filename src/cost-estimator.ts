import { AnalysisResult } from './types';

export interface CostEstimate {
  estimatedCost: number;
  resourceUsage: {
    cpu: string;
    memory: string;
    io: string;
    network: string;
  };
  recommendations: string[];
  costCategory: 'low' | 'medium' | 'high' | 'critical';
}

export class CostEstimator {
  /**
   * Estimate query cost and resource usage
   */
  estimateCost(result: AnalysisResult): CostEstimate {
    const { performance, query } = result;
    const normalizedQuery = query.toLowerCase();
    
    let estimatedCost = 0;
    const recommendations: string[] = [];
    
    // Base cost from execution time
    estimatedCost += performance.executionTime * 0.1;
    
    // Cost factors based on query characteristics
    if (normalizedQuery.includes('select *')) {
      estimatedCost += 50; // Network transfer cost
      recommendations.push('Use specific columns to reduce network transfer');
    }
    
    if (normalizedQuery.includes('join')) {
      const joinCount = (normalizedQuery.match(/join/g) || []).length;
      estimatedCost += joinCount * 25;
      if (joinCount > 3) {
        recommendations.push('Consider if all JOINs are necessary');
      }
    }
    
    if (normalizedQuery.includes('order by') && !normalizedQuery.includes('limit')) {
      estimatedCost += 30;
      recommendations.push('Add LIMIT to reduce sorting cost');
    }
    
    if (normalizedQuery.includes('group by')) {
      estimatedCost += 40;
      recommendations.push('Consider if GROUP BY is necessary');
    }
    
    if (normalizedQuery.includes('distinct')) {
      estimatedCost += 35;
      recommendations.push('DISTINCT can be expensive - check if necessary');
    }
    
    // Resource usage estimation
    const cpuUsage = Math.min(performance.executionTime / 100, 100);
    const memoryUsage = Math.min(performance.rowsReturned * 0.1, 100);
    const ioUsage = performance.cacheHitRatio < 80 ? 'High' : 'Low';
    const networkUsage = performance.rowsReturned > 1000 ? 'High' : 'Low';
    
    // Determine cost category
    let costCategory: 'low' | 'medium' | 'high' | 'critical';
    if (estimatedCost < 100) costCategory = 'low';
    else if (estimatedCost < 300) costCategory = 'medium';
    else if (estimatedCost < 600) costCategory = 'high';
    else costCategory = 'critical';
    
    return {
      estimatedCost: Math.round(estimatedCost),
      resourceUsage: {
        cpu: `${cpuUsage.toFixed(1)}%`,
        memory: `${memoryUsage.toFixed(1)}%`,
        io: ioUsage,
        network: networkUsage
      },
      recommendations,
      costCategory
    };
  }
  
  /**
   * Generate cost report
   */
  generateCostReport(result: AnalysisResult): string {
    const cost = this.estimateCost(result);
    
    let report = '\n💰 Query Cost Analysis\n';
    report += '═══════════════════════════════════════════════════════════════\n\n';
    
    report += `📊 Estimated Cost: ${cost.estimatedCost} units\n`;
    report += `🏷️  Cost Category: ${cost.costCategory.toUpperCase()}\n\n`;
    
    report += '🖥️  Resource Usage:\n';
    report += `  • CPU: ${cost.resourceUsage.cpu}\n`;
    report += `  • Memory: ${cost.resourceUsage.memory}\n`;
    report += `  • I/O: ${cost.resourceUsage.io}\n`;
    report += `  • Network: ${cost.resourceUsage.network}\n\n`;
    
    if (cost.recommendations.length > 0) {
      report += '💡 Cost Optimization Suggestions:\n';
      cost.recommendations.forEach(rec => {
        report += `  • ${rec}\n`;
      });
      report += '\n';
    }
    
    return report;
  }
} 