#!/usr/bin/env node

/**
 * Advanced Usage Example for Enhanced SQL Analyzer
 * 
 * This example demonstrates advanced features including:
 * - Custom configuration
 * - AI integration
 * - Progress monitoring
 * - Multiple report formats
 */

const { 
  EnhancedSQLAnalyzer, 
  ConfigManager, 
  configPresets 
} = require('@sql-analyzer/enhanced');

async function advancedAnalysisExample() {
  console.log('🔬 Enhanced SQL Analyzer - Advanced Usage Example\n');

  // Create analyzer with comprehensive preset and custom config
  const analyzer = new EnhancedSQLAnalyzer(
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'testdb',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    },
    {
      preset: 'comprehensive',
      format: 'html',
      includeAI: !!process.env.OPENAI_API_KEY,
      outputPath: './advanced-reports',
      customConfig: {
        ai: {
          enabled: !!process.env.OPENAI_API_KEY,
          apiKey: process.env.OPENAI_API_KEY,
          model: 'gpt-4',
          maxTokens: 2000
        },
        analysis: {
          securityLevel: 'strict',
          includeAIInsights: !!process.env.OPENAI_API_KEY,
          performanceThreshold: 500
        },
        reporting: {
          includeCharts: true,
          includeBeforeAfter: true,
          includeImplementationGuide: true,
          customBranding: {
            companyName: 'Your Company',
            colors: {
              primary: '#667eea',
              secondary: '#764ba2'
            }
          }
        },
        advanced: {
          verbose: true,
          concurrentAnalysis: true,
          timeout: 60000
        }
      }
    }
  );

  try {
    console.log('🔧 Configuration loaded successfully');
    console.log('📊 Starting comprehensive analysis with progress monitoring...\n');

    // Perform analysis with progress monitoring
    const result = await analyzer.analyzeAndReport({
      returnReport: true,
      skipSave: false,
      onProgress: (step, progress) => {
        const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
        process.stdout.write(`\r${step.padEnd(40)} [${bar}] ${progress}%`);
      }
    });

    console.log('\n\n✅ Analysis Complete!\n');

    // Display detailed summary
    const summary = result.summary;
    console.log('📈 EXECUTIVE SUMMARY');
    console.log('═'.repeat(50));
    console.log(`Overall Health Score: ${summary.overallScore}/10`);
    console.log(`Total Issues: ${summary.totalIssues}`);
    console.log(`Critical Issues: ${summary.criticalIssues}`);
    console.log(`Security Risk Level: ${summary.securityRisk.toUpperCase()}`);
    console.log(`Performance Risk Level: ${summary.performanceRisk.toUpperCase()}`);
    console.log(`Overall Risk Level: ${summary.riskLevel.toUpperCase()}`);
    console.log(`Monthly Savings Potential: $${summary.costSavingsPotential}`);
    console.log(`Implementation Time: ${summary.estimatedImplementationTime}`);

    if (summary.topRecommendations.length > 0) {
      console.log('\n🎯 PRIORITY RECOMMENDATIONS');
      console.log('─'.repeat(50));
      summary.topRecommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    if (result.report && result.report.aiInsights) {
      console.log('\n🤖 AI INSIGHTS');
      console.log('─'.repeat(50));
      console.log(`Assessment: ${result.report.aiInsights.overallAssessment}`);
      console.log(`Risk Analysis: ${result.report.aiInsights.riskAnalysis}`);
      console.log(`Performance Prediction: ${result.report.aiInsights.performancePredictions}`);
    }

    console.log(`\n📄 Report saved to: ${result.reportPath}`);
    console.log('\n🎉 Analysis completed successfully!');

    // Example: Generate additional report formats
    if (result.report) {
      console.log('\n📋 Generating additional report formats...');
      
      // Save as JSON for API consumption
      analyzer.updateConfig({
        reporting: { format: 'json' }
      });
      const jsonPath = await analyzer.generateReport(result.report);
      console.log(`📄 JSON report: ${jsonPath}`);

      // Save as CLI text for documentation
      analyzer.updateConfig({
        reporting: { format: 'cli' }
      });
      const cliPath = await analyzer.generateReport(result.report);
      console.log(`📄 CLI report: ${cliPath}`);
    }

  } catch (error) {
    console.error('\n❌ Analysis failed:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('Configuration validation failed')) {
      console.log('\n💡 Configuration Tips:');
      console.log('   - Check your database connection settings');
      console.log('   - Ensure OPENAI_API_KEY is set if AI is enabled');
      console.log('   - Verify output path permissions');
    }
    
    if (error.message.includes('OpenAI API key')) {
      console.log('\n💡 AI Integration:');
      console.log('   - Set OPENAI_API_KEY environment variable');
      console.log('   - Or disable AI with includeAI: false');
    }
    
    throw error;
  }
}

async function configurationExample() {
  console.log('\n⚙️  CONFIGURATION EXAMPLES\n');

  // Example 1: Load from environment
  console.log('1. Loading configuration from environment variables...');
  const envConfig = ConfigManager.fromEnvironment();
  console.log('   ✅ Environment config loaded');

  // Example 2: Create with preset
  console.log('2. Creating configuration with preset...');
  const devConfig = new ConfigManager(configPresets.development);
  console.log('   ✅ Development preset applied');

  // Example 3: Custom configuration
  console.log('3. Creating custom configuration...');
  const customConfig = new ConfigManager({
    analysis: {
      securityLevel: 'strict',
      includeAIInsights: true
    },
    reporting: {
      format: 'html',
      customBranding: {
        companyName: 'Example Corp'
      }
    }
  });
  
  const validation = customConfig.validateConfig();
  if (validation.valid) {
    console.log('   ✅ Custom configuration is valid');
  } else {
    console.log('   ❌ Configuration errors:', validation.errors);
  }

  // Example 4: Save configuration to file
  try {
    await customConfig.saveToFile('./examples/sample-config.json');
    console.log('4. ✅ Configuration saved to file');
  } catch (error) {
    console.log('4. ❌ Failed to save configuration:', error.message);
  }
}

async function cicdExample() {
  console.log('\n🔄 CI/CD INTEGRATION EXAMPLE\n');

  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/testdb';

  try {
    // Simulate CI/CD analysis
    console.log('Running CI/CD analysis...');
    const result = await EnhancedSQLAnalyzer.ciAnalysis(connectionString);

    console.log(`Analysis Result: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Health Score: ${result.score}/10`);
    console.log(`Critical Issues: ${result.criticalIssues}`);
    console.log(`Report: ${result.reportPath}`);

    if (!result.passed) {
      console.log('\n💡 CI/CD Integration Tips:');
      console.log('   - Use --fail-on-critical flag in CLI');
      console.log('   - Set minimum score thresholds');
      console.log('   - Archive reports as build artifacts');
      
      // In a real CI environment, you would exit with non-zero code
      // process.exit(1);
    }

  } catch (error) {
    console.error('CI/CD analysis failed:', error.message);
  }
}

async function main() {
  try {
    await advancedAnalysisExample();
    await configurationExample();
    await cicdExample();
  } catch (error) {
    console.error('\n💥 Example failed:', error.message);
    process.exit(1);
  }
}

// Run example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  advancedAnalysisExample,
  configurationExample,
  cicdExample
};