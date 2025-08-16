import chalk from 'chalk';
import ora, { Ora } from 'ora';

export interface ProgressStep {
  name: string;
  weight: number;
  description: string;
}

export class ProgressTracker {
  private spinner: Ora;
  private currentStep: number = 0;
  private totalWeight: number = 0;
  private steps: ProgressStep[] = [];

  constructor() {
    this.spinner = ora('Initializing...').start();
  }

  setSteps(steps: ProgressStep[]): void {
    this.steps = steps;
    this.totalWeight = steps.reduce((sum, step) => sum + step.weight, 0);
  }

  startStep(stepName: string): void {
    const step = this.steps.find(s => s.name === stepName);
    if (step) {
      this.currentStep = this.steps.indexOf(step);
      this.spinner.text = `🔍 ${step.description}`;
    }
  }

  updateProgress(stepName: string, progress: number): void {
    const step = this.steps.find(s => s.name === stepName);
    if (step) {
      const currentStepIndex = this.steps.indexOf(step);
      const completedWeight = this.steps
        .slice(0, currentStepIndex)
        .reduce((sum, s) => sum + s.weight, 0);
      
      const currentStepProgress = (step.weight * progress) / 100;
      const totalProgress = ((completedWeight + currentStepProgress) / this.totalWeight) * 100;
      
      this.spinner.text = `🔍 ${step.description} (${Math.round(totalProgress)}%)`;
    }
  }

  completeStep(stepName: string): void {
    const step = this.steps.find(s => s.name === stepName);
    if (step) {
      const currentStepIndex = this.steps.indexOf(step);
      const completedWeight = this.steps
        .slice(0, currentStepIndex + 1)
        .reduce((sum, s) => sum + s.weight, 0);
      
      const totalProgress = (completedWeight / this.totalWeight) * 100;
      
      this.spinner.text = `✅ ${step.description} completed (${Math.round(totalProgress)}%)`;
    }
  }

  success(message: string): void {
    this.spinner.succeed(message);
  }

  fail(message: string): void {
    this.spinner.fail(message);
  }

  info(message: string): void {
    this.spinner.info(message);
  }

  warn(message: string): void {
    this.spinner.warn(message);
  }

  stop(): void {
    this.spinner.stop();
  }

  // Predefined analysis steps
  static getDefaultSteps(): ProgressStep[] {
    return [
      { name: 'connection', weight: 5, description: 'Testing database connection...' },
      { name: 'schema', weight: 20, description: 'Analyzing database schema...' },
      { name: 'indexes', weight: 25, description: 'Analyzing indexes and performance...' },
      { name: 'security', weight: 20, description: 'Auditing security policies...' },
      { name: 'performance', weight: 20, description: 'Analyzing performance metrics...' },
      { name: 'reporting', weight: 10, description: 'Generating comprehensive report...' }
    ];
  }

  // Show estimated time remaining
  showTimeEstimate(startTime: number): void {
    const elapsed = Date.now() - startTime;
    const progress = this.getCurrentProgress();
    
    if (progress > 0) {
      const estimatedTotal = elapsed / (progress / 100);
      const remaining = estimatedTotal - elapsed;
      
      if (remaining > 0) {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        if (minutes > 0) {
          this.spinner.text += ` (${minutes}m ${seconds}s remaining)`;
        } else {
          this.spinner.text += ` (${seconds}s remaining)`;
        }
      }
    }
  }

  private getCurrentProgress(): number {
    if (this.steps.length === 0) return 0;
    
    const completedWeight = this.steps
      .slice(0, this.currentStep + 1)
      .reduce((sum, step) => sum + step.weight, 0);
    
    return (completedWeight / this.totalWeight) * 100;
  }
}
