#!/usr/bin/env node

/**
 * Quick Start Example for Enhanced SQL Analyzer
 * 
 * This example demonstrates how to use the Enhanced SQL Analyzer
 * to perform comprehensive database health analysis.
 */

const { EnhancedSQLAnalyzer, configPresets } = require('@sql-analyzer/enhanced');

async function main() {
  console.log('🚀 Enhanced SQL Analyzer - Quick Start Example\n');

  // Database connection string - replace with your database
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/testdb';
  
  try {
    console.log('📊 Running quick analysis...');
    
    // Method 1: Quick analysis (simplest approach)
    const summary = await EnhancedSQLAnalyzer.quickAnalysis(connectionString, {
      format: 'html',
      includeAI: false, // Set to true if you have OpenAI API key
      outputPath: './reports'
    });

    console.log('\n✅ Analysis Complete!');
    console.log(`📈 Overall Health Score: ${summary.overallScore}/10`);
    console.log(`🔍 Total Issues Found: ${summary.totalIssues}`);
    console.log(`⚠️  Critical Issues: ${summary.criticalIssues}`);
    console.log(`🔒 Security Risk: ${summary.securityRisk.toUpperCase()}`);
    console.log(`⚡ Performance Risk: ${summary.performanceRisk.toUpperCase()}`);
    console.log(`💰 Monthly Savings Potential: $${summary.costSavingsPotential}`);
    console.log(`⏱️  Estimated Implementation Time: ${summary.estimatedImplementationTime}`);

    if (summary.topRecommendations.length > 0) {
      console.log('\n🎯 Top Recommendations:');
      summary.topRecommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    console.log('\n📄 HTML report has been generated in ./reports/');

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Tip: Make sure your PostgreSQL database is running and accessible.');
      console.log('   You can start a test database with Docker:');
      console.log('   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres');
    }
    
    if (error.message.includes('does not exist')) {
      console.log('\n💡 Tip: Make sure the database exists and the connection string is correct.');
    }
    
    process.exit(1);
  }
}

// Run example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = main;