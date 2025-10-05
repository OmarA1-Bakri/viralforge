import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { authenticateToken, getUserId, AuthRequest } from '../auth';

const router = Router();

// Apply auth to all agent routes
router.use(authenticateToken);

// =============================================================================
// AGENT STATUS & HEALTH MONITORING
// =============================================================================

/**
 * GET /api/agents/status
 * Get overall agent system status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = {
      system_status: 'operational',
      timestamp: new Date().toISOString(),
      python_agents_available: !!process.env.CREW_AGENT_URL,
      environment_variables: {
        crewai_http_configured: !!process.env.CREW_AGENT_URL,
        crewai_script_configured: !!process.env.CREWAI_SCRIPT_PATH,
        openrouter_configured: !!process.env.OPENROUTER_API_KEY,
        database_configured: !!process.env.DATABASE_URL
      }
    };

    res.json({ 
      success: true, 
      data: status 
    });
  } catch (error) {
    console.error('Error getting agent status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get agent status' 
    });
  }
});

/**
 * GET /api/agents/config
 * Get agent system configuration and requirements
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const agentUrl = process.env.CREW_AGENT_URL;
    const pythonScriptPath = process.env.CREWAI_SCRIPT_PATH;

    const config = {
      python_agents: {
        enabled: !!agentUrl || !!pythonScriptPath,
        service_url: agentUrl || 'Not configured',
        script_path: pythonScriptPath || 'Legacy CLI not configured',
        requirements: [
          'crewai>=0.201.0',
          'crewai-tools>=0.12.0',
          'fastapi>=0.115.0',
          'python-dotenv>=1.0.0'
        ]
      },
      ai_services: {
        openrouter: !!process.env.OPENROUTER_API_KEY,
        serper: !!process.env.SERPER_API_KEY,
        tavily: !!process.env.TAVILY_API_KEY,
        firecrawl: !!process.env.FIRECRAWL_API_KEY
      },
      knowledge_base: {
        sources: [
          'knowledge/viral_patterns.md',
          'knowledge/platform_guidelines.md',
          'knowledge/content_strategies.md'
        ]
      }
    };

    res.json({ 
      success: true, 
      data: config 
    });
  } catch (error) {
    console.error('Error getting agent config:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get configuration' 
    });
  }
});

// =============================================================================
// USER ACTIVITY & INSIGHTS
// =============================================================================

/**
 * GET /api/agents/activity
 * Get user's agent-generated activities
 */
router.get('/activity', async (req: AuthRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { limit = 20, timeframe = 'week' } = req.query;
    
    const activities = await storage.getUserActivity(
      userId, 
      parseInt(limit as string),
      timeframe as string
    );

    // Filter for AI-generated activities
    const aiActivities = activities.filter(a => 
      a.activityType.includes('ai_') || 
      a.activityType.includes('trend_') ||
      a.activityType.includes('auto_')
    );

    res.json({
      success: true,
      data: {
        activities: aiActivities,
        total: aiActivities.length
      }
    });
  } catch (error) {
    console.error('Error getting agent activity:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get activities' 
    });
  }
});

export default router;
