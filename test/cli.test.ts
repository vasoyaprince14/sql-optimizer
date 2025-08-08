import { spawnSync } from 'child_process';
import { join } from 'path';

describe('CLI', () => {
  it('prints help', () => {
    const cliPath = join(__dirname, '..', 'dist', 'bin', 'enhanced-cli.js');
    const result = spawnSync('node', [cliPath, '--help'], { encoding: 'utf-8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Usage:');
    expect(result.stdout).toContain('health');
  });
});

