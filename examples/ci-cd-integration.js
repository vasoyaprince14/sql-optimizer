#!/usr/bin/env node

/**
 * CI/CD Integration Example for Enhanced SQL Analyzer
 * 
 * This example demonstrates how to integrate the SQL analyzer
 * into CI/CD pipelines with quality gates and automated reporting.
 */

const { EnhancedSQLAnalyzer } = require('@sql-analyzer');
const fs = require('fs');
const path = require('path');

async function cicdIntegration() {
  console.log('🔄 CI/CD Database Health Check Integration\n');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  try {
    // Configuration for CI/CD environment
    const ciConfig = {
      format: 'json',
      includeAI: false, // Disable AI for faster CI runs
      outputPath: './reports',
      preset: 'ci',
      customConfig: {
        analysis: {
          securityLevel: 'strict',
          includeAIInsights: false
        },
        reporting: {
          format: 'json'
        },
        advanced: {
          timeout: 60000, // 1 minute timeout for CI
          verbose: false
        }
      }
    };

    console.log('🚀 Running CI/CD optimized analysis...');
    
    // Use CI-optimized analysis method
    const result = await EnhancedSQLAnalyzer.ciAnalysis(connectionString);
    
    console.log('\n📊 ANALYSIS RESULTS');
    console.log('═'.repeat(50));
    console.log(`Health Score: ${result.score}/10`);
    console.log(`Critical Issues: ${result.criticalIssues}`);
    console.log(`Report Path: ${result.reportPath}`);
    console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);

    // Save results for CI artifacts
    const artifactsPath = './artifacts';
    if (!fs.existsSync(artifactsPath)) {
      fs.mkdirSync(artifactsPath, { recursive: true });
    }

    // Save summary for CI systems
    const summary = {
      timestamp: new Date().toISOString(),
      healthScore: result.score,
      criticalIssues: result.criticalIssues,
      passed: result.passed,
      reportPath: result.reportPath,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        ciSystem: process.env.CI || 'unknown'
      }
    };

    fs.writeFileSync(
      path.join(artifactsPath, 'db-health-summary.json'),
      JSON.stringify(summary, null, 2)
    );

    // Generate quality gate results
    const qualityGate = {
      gates: [
        {
          name: 'No Critical Issues',
          passed: result.criticalIssues === 0,
          threshold: 0,
          actual: result.criticalIssues
        },
        {
          name: 'Minimum Health Score',
          passed: result.score >= 7.0,
          threshold: 7.0,
          actual: result.score
        }
      ],
      overallPassed: result.passed && result.score >= 7.0
    };

    fs.writeFileSync(
      path.join(artifactsPath, 'quality-gates.json'),
      JSON.stringify(qualityGate, null, 2)
    );

    console.log('\n🎯 QUALITY GATES');
    console.log('─'.repeat(50));
    qualityGate.gates.forEach(gate => {
      const status = gate.passed ? '✅' : '❌';
      console.log(`${status} ${gate.name}: ${gate.actual} (threshold: ${gate.threshold})`);
    });

    // Generate badges for README
    const badges = {
      healthScore: `https://img.shields.io/badge/Health%20Score-${result.score}/10-${result.score >= 8 ? 'green' : result.score >= 6 ? 'yellow' : 'red'}`,
      criticalIssues: `https://img.shields.io/badge/Critical%20Issues-${result.criticalIssues}-${result.criticalIssues === 0 ? 'green' : 'red'}`,
      status: `https://img.shields.io/badge/DB%20Status-${result.passed ? 'Healthy' : 'Issues'}-${result.passed ? 'green' : 'red'}`
    };

    fs.writeFileSync(
      path.join(artifactsPath, 'badges.json'),
      JSON.stringify(badges, null, 2)
    );

    // GitHub Actions specific outputs
    if (process.env.GITHUB_ACTIONS) {
      console.log('\n🐙 GitHub Actions Outputs');
      console.log(`::set-output name=health-score::${result.score}`);
      console.log(`::set-output name=critical-issues::${result.criticalIssues}`);
      console.log(`::set-output name=passed::${result.passed}`);
      console.log(`::set-output name=report-path::${result.reportPath}`);
    }

    // Jenkins specific outputs
    if (process.env.JENKINS_URL) {
      console.log('\n🔧 Jenkins Properties');
      const jenkinsProps = [
        `DB_HEALTH_SCORE=${result.score}`,
        `DB_CRITICAL_ISSUES=${result.criticalIssues}`,
        `DB_HEALTH_PASSED=${result.passed}`,
        `DB_REPORT_PATH=${result.reportPath}`
      ];
      
      fs.writeFileSync(
        path.join(artifactsPath, 'jenkins.properties'),
        jenkinsProps.join('\n')
      );
    }

    // GitLab CI specific outputs
    if (process.env.GITLAB_CI) {
      console.log('\n🦊 GitLab CI Metrics');
      const metrics = [
        `db_health_score ${result.score}`,
        `db_critical_issues ${result.criticalIssues}`,
        `db_health_passed ${result.passed ? 1 : 0}`
      ];
      
      fs.writeFileSync(
        path.join(artifactsPath, 'metrics.txt'),
        metrics.join('\n')
      );
    }

    console.log('\n📁 Artifacts Generated:');
    console.log(`  - ${path.join(artifactsPath, 'db-health-summary.json')}`);
    console.log(`  - ${path.join(artifactsPath, 'quality-gates.json')}`);
    console.log(`  - ${path.join(artifactsPath, 'badges.json')}`);

    // Exit with appropriate code
    if (!qualityGate.overallPassed) {
      console.log('\n❌ Quality gates failed - exiting with code 1');
      process.exit(1);
    }

    console.log('\n✅ All quality gates passed - CI/CD check successful!');
    process.exit(0);

  } catch (error) {
    console.error('\n💥 CI/CD check failed:', error.message);
    
    // Save error for CI artifacts
    const errorArtifact = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform
      }
    };

    try {
      if (!fs.existsSync('./artifacts')) {
        fs.mkdirSync('./artifacts', { recursive: true });
      }
      fs.writeFileSync(
        './artifacts/error.json',
        JSON.stringify(errorArtifact, null, 2)
      );
    } catch (writeError) {
      console.error('Failed to save error artifact:', writeError.message);
    }

    process.exit(1);
  }
}

// Enhanced error handling for different CI systems
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run if this file is executed directly
if (require.main === module) {
  cicdIntegration().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = cicdIntegration;