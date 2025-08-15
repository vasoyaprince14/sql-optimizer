import { execSync } from 'child_process';
import chalk from 'chalk';

export class UpdateChecker {
  private static readonly PACKAGE_NAME = '@vasoyaprince14/sql-analyzer';
  private static CURRENT_VERSION: string = '1.4.1';
  private static readonly UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  static {
    try {
      // Get current version from package.json
      const packageJson = require('../../package.json');
      UpdateChecker.CURRENT_VERSION = packageJson.version;
    } catch {
      UpdateChecker.CURRENT_VERSION = '1.4.1';
    }
  }

  static async checkForUpdates(): Promise<void> {
    try {
      // Check if we should skip update check (for CI/CD environments)
      if (process.env.CI || process.env.NODE_ENV === 'test') {
        return;
      }

      const latestVersion = await this.getLatestVersion();
      
      if (latestVersion && this.isNewerVersion(latestVersion, this.CURRENT_VERSION)) {
        this.showUpdateMessage(latestVersion);
      }
    } catch (error) {
      // Silently fail - don't interrupt user experience
    }
  }

  private static async getLatestVersion(): Promise<string | null> {
    try {
      const result = execSync(`npm view ${this.PACKAGE_NAME} version`, { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      });
      return result.trim();
    } catch {
      return null;
    }
  }

  private static isNewerVersion(latest: string, current: string): boolean {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);
    
    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const latestPart = latestParts[i] || 0;
      const currentPart = currentParts[i] || 0;
      
      if (latestPart > currentPart) return true;
      if (latestPart < currentPart) return false;
    }
    
    return false;
  }

  private static showUpdateMessage(latestVersion: string): void {
    console.log('\n' + '='.repeat(60));
    console.log(chalk.yellow.bold('🚀 NEW VERSION AVAILABLE!'));
    console.log(chalk.white(`Current: ${this.CURRENT_VERSION} | Latest: ${latestVersion}`));
    console.log(chalk.cyan('📦 Update with: npm update -g @vasoyaprince14/sql-analyzer'));
    console.log(chalk.cyan('🔗 Or visit: https://github.com/vasoyaprince14/sql-optimizer'));
    console.log(chalk.green('💝 Support us: https://github.com/sponsors/vasoyaprince14'));
    console.log('='.repeat(60) + '\n');
  }

  static showFundingMessage(): void {
    console.log('\n' + '='.repeat(60));
    console.log(chalk.green.bold('💝 SUPPORT SQL ANALYZER DEVELOPMENT'));
    console.log(chalk.white('If this tool helps you, consider supporting our work:'));
    console.log(chalk.cyan('🌟 GitHub Sponsors: https://github.com/sponsors/vasoyaprince14'));
    console.log(chalk.cyan('⭐ Star the repo: https://github.com/vasoyaprince14/sql-optimizer'));
    console.log(chalk.cyan('🐛 Report issues: https://github.com/vasoyaprince14/sql-optimizer/issues'));
    console.log(chalk.yellow('Your support helps us add more features and databases!'));
    console.log('='.repeat(60) + '\n');
  }
}
