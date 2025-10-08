import { AutomationScheduler, automationScheduler } from './scheduler';
import { storage } from '../storage';
import { log } from '../vite';
import cron from 'node-cron';

interface TrendDiscoveryResult {
  success: boolean;
  trends_discovered: number;
  trends: unknown;
  metadata: Record<string, unknown>;
}

interface ContentCreationResult {
  success: boolean;
  content_created: number;
  content: unknown;
  metadata: Record<string, unknown>;
}

interface FullPipelineResult {
  success: boolean;
  workflow: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

/**
 * AI-Enhanced Scheduler Bridge
 *
 * The scheduler now talks to the CrewAI service over HTTP (FastAPI) while keeping the
 * TypeScript automation workflows as a fallback when the service is unavailable.
 * Legacy child-process execution remains available via CREWAI_SCRIPT_PATH but is no longer
 * the primary integration path.
 */
export class AIEnhancedScheduler extends AutomationScheduler {
  private agentServiceAvailable = false;
  private agentServiceUrl = process.env.CREW_AGENT_URL || '';

  constructor() {
    super();
    this.checkAgentServiceAvailability().catch((error) => {
      log(`⚠️ Agent service availability check failed: ${error}`);
    });
  }

  private async checkAgentServiceAvailability(): Promise<void> {
    if (!this.agentServiceUrl) {
      log('📝 CREW_AGENT_URL not set - agent service disabled');
      this.agentServiceAvailable = false;
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(new URL('/health', this.agentServiceUrl), {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      this.agentServiceAvailable = response.ok;

      if (this.agentServiceAvailable) {
        log(`🔍 Agent service reachable at ${this.agentServiceUrl}`);
      } else {
        log(`⚠️ Agent service returned HTTP ${response.status}`);
      }
    } catch (error) {
      this.agentServiceAvailable = false;
      const message = error instanceof Error ? error.message : String(error);
      log(`⚠️ Agent service check failed: ${message}`);
    }
  }

  /**
   * Start the AI-enhanced automation system
   */
  start(): void {
    log('🚀 Starting AI-Enhanced ViralForge Automation System...');

    // Always start the base TypeScript scheduler
    super.start();

    this.checkAgentServiceAvailability()
      .then(() => {
        if (this.agentServiceAvailable) {
          log('🤖 Agent service detected - enabling enhanced AI workflows');
          this.scheduleAIWorkflows();
        } else if (this.agentServiceUrl) {
          log('⚠️ Agent service configured but unreachable - using TypeScript-only automation');
        } else {
          log('📝 Agent service not configured - using TypeScript-only automation');
        }
      })
      .catch((error) => {
        log(`⚠️ Agent service probe failed: ${error}`);
      })
      .finally(() => {
        log('✅ AI-Enhanced automation system started successfully');
      });
  }

  /**
   * Schedule enhanced AI workflows (when Python agents are available)
   */
  private scheduleAIWorkflows(): void {
    // DISABLED: AI-Powered Trend Discovery (every 4 hours) - too frequent for production
    // cron.schedule('0 */4 * * *', () => this.aiTrendDiscoveryWorkflow());

    // DISABLED: AI-Powered Content Creation (every 6 hours) - too frequent
    // cron.schedule('0 */6 * * *', () => this.aiContentCreationWorkflow());

    // DISABLED: AI-Powered Performance Analysis (every 2 hours) - too frequent, fills database
    // cron.schedule('0 */2 * * *', () => this.aiPerformanceAnalysisWorkflow());

    // DISABLED: Full AI Pipeline Execution (daily at 8 AM) - resource intensive
    // cron.schedule('0 8 * * *', () => this.aiFullPipelineWorkflow());

    log('🤖 Enhanced AI workflows disabled to conserve database storage');
  }

  /**
   * Execute AI-powered trend discovery workflow
   */
  private async aiTrendDiscoveryWorkflow(): Promise<void> {
    log('🕵️ Starting AI-powered trend discovery workflow...');

    if (!this.agentServiceAvailable) {
      log('⚠️ Agent service not available, falling back to standard trend monitoring');
      return this.dailyTrendMonitoring();
    }

    try {
      const result = await this.callAgentService<TrendDiscoveryResult>(
        '/agents/trend-discovery',
        {
        platforms: ['tiktok', 'youtube'],
        niches: ['all'],
      },
      );

      log(`✅ AI trend discovery completed: ${result.trends_discovered} trends found`);
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

    if (!this.agentServiceAvailable) {
      log('⚠️ Agent service not available, falling back to standard content processing');
      return this.backgroundVideoProcessing();
    }

    try {
      const result = await this.callAgentService<ContentCreationResult>(
        '/agents/content-creation',
        {
          trend_data: {
            summary: 'Automated generation request',
            requestedPlatforms: ['tiktok', 'youtube'],
          },
          content_type: 'video',
        },
      );

      log(`✅ AI content creation completed: ${result.content_created} pieces created`);
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

    if (!this.agentServiceAvailable) {
      log('⚠️ Agent service not available, falling back to standard content scoring');
      return this.automaticContentScoring();
    }

    try {
      await this.callAgentService<never>('/agents/performance-analysis', {
        analysis_period: '24h',
        metrics: ['engagement', 'reach', 'virality'],
      });

      log('ℹ️ CrewAI performance analysis not yet implemented - continuing with fallback');
      return this.automaticContentScoring();
    } catch (error) {
      log(`ℹ️ AI performance analysis unavailable (${error}). Using standard content scoring.`);
      return this.automaticContentScoring();
    }
  }

  /**
   * Execute full AI pipeline workflow
   */
  private async aiFullPipelineWorkflow(): Promise<void> {
    log('🔄 Starting full AI pipeline workflow...');

    if (!this.agentServiceAvailable) {
      log('⚠️ Agent service not available, running standard automation tasks');
      await Promise.all([
        this.dailyTrendMonitoring(),
        this.automaticContentScoring(),
        this.generatePostingSchedules(),
        this.checkTrendingOpportunities()
      ]);
      return;
    }

    try {
      const users = await storage.getAllUsers();

      for (const user of users) {
        try {
          const payload = {
            user_id: user.id,
            campaign_config: {
              execute_all: true,
              include_reporting: true,
            },
          };

          const result = await this.callAgentService<FullPipelineResult>(
            '/agents/full-pipeline',
            payload,
          );

          log(`✅ Full AI pipeline completed for user ${user.id}`);
          log(`ℹ️ Pipeline metadata: ${JSON.stringify(result.metadata)}`);
        } catch (userError) {
          const message = userError instanceof Error ? userError.message : String(userError);
          log(`⚠️ Full pipeline failed for user ${user.id}: ${message}`);
        }
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

  private async callAgentService<T>(path: string, payload: unknown): Promise<T> {
    if (!this.agentServiceAvailable) {
      throw new Error('Agent service unavailable');
    }

    const url = new URL(path, this.agentServiceUrl);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload ?? {}),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    return (await response.json()) as T;
  }
}

// Export singleton instance
export const ai_enhanced_scheduler = new AIEnhancedScheduler();
