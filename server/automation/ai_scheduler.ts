import { spawn } from 'child_process';
import { AutomationScheduler, automationScheduler } from './scheduler';
import { log } from '../vite';

/**
 * AI-Enhanced Scheduler Bridge
 * 
 * This TypeScript module provides a bridge to the Python CrewAI multi-agent system
 * while maintaining compatibility with the existing TypeScript automation system.
 * 
 * On the agentic-branch, it can optionally invoke Python agents via child processes.
 * On the main branch, it falls back to the standard TypeScript scheduler.
 */
export class AIEnhancedScheduler extends AutomationScheduler {
  private pythonAgentsAvailable: boolean = false;
  private crewaiPath: string = process.env.CREWAI_SCRIPT_PATH || '';

  constructor() {
    super();
    this.checkPythonAgentsAvailability();
  }

  /**
   * Check if Python CrewAI agents are available
   */
  private async checkPythonAgentsAvailability(): Promise<void> {
    try {
      if (!this.crewaiPath) {
        this.pythonAgentsAvailable = false;
        log('📝 CREWAI_SCRIPT_PATH not set - Python agents disabled');
        return;
      }
      
      const fs = await import('fs');
      const path = await import('path');
      const absolutePath = path.isAbsolute(this.crewaiPath) 
        ? this.crewaiPath 
        : path.join(process.cwd(), this.crewaiPath);
      
      this.pythonAgentsAvailable = fs.existsSync(absolutePath);
      this.crewaiPath = absolutePath;
      log(`🔍 Python CrewAI agents available: ${this.pythonAgentsAvailable}`);
    } catch (error) {
      this.pythonAgentsAvailable = false;
      log(`⚠️ Python agents check failed: ${error}`);
    }
  }

  /**
   * Start the AI-enhanced automation system
   */
  start(): void {
    log('🚀 Starting AI-Enhanced ViralForge Automation System...');

    // Always start the base TypeScript scheduler
    super.start();

    if (this.pythonAgentsAvailable) {
      log('🤖 Python CrewAI agents detected - enabling enhanced AI workflows');
      this.scheduleAIWorkflows();
    } else {
      log('📝 Using TypeScript-only automation (CrewAI agents not available)');
    }

    log('✅ AI-Enhanced automation system started successfully');
  }

  /**
   * Schedule enhanced AI workflows (when Python agents are available)
   */
  private scheduleAIWorkflows(): void {
    const cron = require('node-cron');

    // AI-Powered Trend Discovery (every 4 hours)
    cron.schedule('0 */4 * * *', () => this.aiTrendDiscoveryWorkflow());

    // AI-Powered Content Creation (every 6 hours)
    cron.schedule('0 */6 * * *', () => this.aiContentCreationWorkflow());

    // AI-Powered Performance Analysis (every 2 hours) 
    cron.schedule('0 */2 * * *', () => this.aiPerformanceAnalysisWorkflow());

    // Full AI Pipeline Execution (daily at 8 AM)
    cron.schedule('0 8 * * *', () => this.aiFullPipelineWorkflow());

    log('🤖 Enhanced AI workflows scheduled');
  }

  /**
   * Execute AI-powered trend discovery workflow
   */
  private async aiTrendDiscoveryWorkflow(): Promise<void> {
    log('🕵️ Starting AI-powered trend discovery workflow...');

    if (!this.pythonAgentsAvailable) {
      log('⚠️ Python agents not available, falling back to standard trend monitoring');
      return this.dailyTrendMonitoring();
    }

    try {
      const result = await this.executePythonAgent('trend_discovery', {
        platforms: ['tiktok', 'youtube'],
        categories: ['all']
      });

      if (result.success) {
        log(`✅ AI trend discovery completed: ${result.trends_discovered} trends found`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      log(`❌ AI trend discovery failed: ${error}`);
      log('🔄 Falling back to standard trend monitoring');
      return this.dailyTrendMonitoring();
    }
  }

  /**
   * Execute AI-powered content creation workflow
   */
  private async aiContentCreationWorkflow(): Promise<void> {
    log('🎨 Starting AI-powered content creation workflow...');

    if (!this.pythonAgentsAvailable) {
      log('⚠️ Python agents not available, falling back to standard content processing');
      return this.backgroundVideoProcessing();
    }

    try {
      const result = await this.executePythonAgent('content_creation', {
        content_types: ['video', 'text'],
        platforms: ['tiktok', 'youtube']
      });

      if (result.success) {
        log(`✅ AI content creation completed: ${result.content_created} pieces created`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      log(`❌ AI content creation failed: ${error}`);
      log('🔄 Falling back to standard video processing');
      return this.backgroundVideoProcessing();
    }
  }

  /**
   * Execute AI-powered performance analysis workflow
   */
  private async aiPerformanceAnalysisWorkflow(): Promise<void> {
    log('📊 Starting AI-powered performance analysis workflow...');

    if (!this.pythonAgentsAvailable) {
      log('⚠️ Python agents not available, falling back to standard content scoring');
      return this.automaticContentScoring();
    }

    try {
      const result = await this.executePythonAgent('performance_analysis', {
        analysis_period: '24h',
        metrics: ['engagement', 'reach', 'virality']
      });

      if (result.success) {
        log(`✅ AI performance analysis completed: ${result.content_analyzed} items analyzed`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      log(`❌ AI performance analysis failed: ${error}`);
      log('🔄 Falling back to standard content scoring');
      return this.automaticContentScoring();
    }
  }

  /**
   * Execute full AI pipeline workflow
   */
  private async aiFullPipelineWorkflow(): Promise<void> {
    log('🔄 Starting full AI pipeline workflow...');

    if (!this.pythonAgentsAvailable) {
      log('⚠️ Python agents not available, running standard automation tasks');
      await Promise.all([
        this.dailyTrendMonitoring(),
        this.automaticContentScoring(),
        this.generatePostingSchedules(),
        this.checkTrendingOpportunities()
      ]);
      return;
    }

    try {
      const result = await this.executePythonAgent('full_pipeline', {
        execute_all: true,
        include_reporting: true
      });

      if (result.success) {
        log(`✅ Full AI pipeline completed successfully`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      log(`❌ Full AI pipeline failed: ${error}`);
      log('🔄 Running standard automation tasks as fallback');
      await Promise.all([
        this.dailyTrendMonitoring(),
        this.automaticContentScoring(),
        this.generatePostingSchedules(),
        this.checkTrendingOpportunities()
      ]);
    }
  }

  /**
   * Execute a Python agent via child process
   */
  private async executePythonAgent(agent: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const python = spawn('python3', [this.crewaiPath, agent, JSON.stringify(params)]);
      
      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to parse Python agent output: ${stdout}`));
          }
        } else {
          reject(new Error(`Python agent failed with code ${code}: ${stderr}`));
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });

      // Set a timeout for the Python process
      setTimeout(() => {
        python.kill('SIGTERM');
        reject(new Error('Python agent execution timed out'));
      }, 300000); // 5 minutes timeout
    });
  }
}

// Export singleton instance
export const ai_enhanced_scheduler = new AIEnhancedScheduler();
