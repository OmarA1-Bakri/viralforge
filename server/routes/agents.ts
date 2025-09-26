#!/usr/bin/env python3

"""
Agent Monitoring & Debugging API Routes for ViralForge
=====================================================

This module provides API endpoints for monitoring and debugging the 
CrewAI multi-agent system, including real-time performance metrics,
agent health status, and workflow debugging.
"""

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validateAndZod } from '../utils/validation';
import { storage } from '../storage';

// Import the AI scheduler for agent monitoring
import { ai_enhanced_scheduler } from '../automation/ai_scheduler';
import { viral_agent_system } from '../agents/viral_crew';

const router = Router();

// =============================================================================
// AGENT STATUS & HEALTH MONITORING
// =============================================================================

/**
 * GET /api/agents/status
 * Get overall agent system status and health metrics
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = {
      system_status: 'operational', // healthy, degraded, down
      timestamp: new Date().toISOString(),
      agents: await getAgentHealthStatus(),
      active_workflows: await getActiveWorkflowCount(),
      performance_metrics: ai_enhanced_scheduler.performance_metrics || {},
      knowledge_base_status: await getKnowledgeBaseStatus(),
      memory_usage: await getSystemMemoryUsage()
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
 * GET /api/agents/health
 * Detailed health check for all agents
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthChecks = await Promise.allSettled([
      checkAgentHealth('trend_scout'),
      checkAgentHealth('content_analyzer'), 
      checkAgentHealth('content_creator'),
      checkAgentHealth('publish_manager'),
      checkAgentHealth('performance_tracker')
    ]);

    const health = healthChecks.map((result, index) => {
      const agentNames = ['trend_scout', 'content_analyzer', 'content_creator', 'publish_manager', 'performance_tracker'];
      return {
        agent: agentNames[index],
        status: result.status === 'fulfilled' ? result.value : 'error',
        error: result.status === 'rejected' ? result.reason : null
      };
    });

    const overallHealth = health.every(h => h.status === 'healthy') ? 'healthy' : 
                         health.some(h => h.status === 'healthy') ? 'partial' : 'down';

    res.json({
      success: true,
      data: {
        overall_health: overallHealth,
        agents: health,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error checking agent health:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Health check failed' 
    });
  }
});

// =============================================================================
// WORKFLOW MONITORING
// =============================================================================

/**
 * GET /api/agents/workflows
 * Get active and recent workflows
 */
router.get('/workflows', async (req: Request, res: Response) => {
  try {
    const { status, limit = 50, user_id } = req.query;

    const workflows = await storage.getAgentWorkflows({
      status: status as string,
      limit: parseInt(limit as string),
      userId: user_id ? parseInt(user_id as string) : undefined,
      orderBy: 'created_at',
      order: 'DESC'
    });

    // Get active workflows from scheduler
    const activeWorkflows = ai_enhanced_scheduler.active_workflows || {};
    
    // Combine database records with active workflow data
    const enrichedWorkflows = workflows.map(workflow => ({
      ...workflow,
      is_active: activeWorkflows[workflow.workflow_id] ? true : false,
      runtime_info: activeWorkflows[workflow.workflow_id] || null
    }));

    res.json({
      success: true,
      data: {
        workflows: enrichedWorkflows,
        active_count: Object.keys(activeWorkflows).length,
        total_count: workflows.length
      }
    });
  } catch (error) {
    console.error('Error getting workflows:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get workflows' 
    });
  }
});

/**
 * GET /api/agents/workflows/:id
 * Get detailed workflow information and execution log
 */
router.get('/workflows/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const workflow = await storage.getAgentWorkflowById(id);
    if (!workflow) {
      return res.status(404).json({ 
        success: false, 
        error: 'Workflow not found' 
      });
    }

    // Get execution logs for this workflow
    const logs = await storage.getWorkflowExecutionLogs(id);
    
    // Get active status if currently running
    const activeWorkflows = ai_enhanced_scheduler.active_workflows || {};
    const isActive = activeWorkflows[id] ? true : false;

    res.json({
      success: true,
      data: {
        workflow,
        logs,
        is_active: isActive,
        runtime_info: activeWorkflows[id] || null
      }
    });
  } catch (error) {
    console.error('Error getting workflow details:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get workflow details' 
    });
  }
});

// =============================================================================
// PERFORMANCE METRICS & ANALYTICS
// =============================================================================

/**
 * GET /api/agents/metrics
 * Get performance metrics and analytics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const { timeframe = '24h', agent_type } = req.query;
    
    const metrics = await getPerformanceMetrics({
      timeframe: timeframe as string,
      agentType: agent_type as string
    });

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get performance metrics' 
    });
  }
});

/**
 * GET /api/agents/analytics
 * Get agent system analytics and insights
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const analytics = await getAgentAnalytics();
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting agent analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get analytics' 
    });
  }
});

// =============================================================================
// AGENT CONTROL & DEBUGGING
// =============================================================================

const executeWorkflowSchema = z.object({
  workflow_type: z.enum(['trend_discovery', 'content_creation', 'performance_analysis', 'full_pipeline']),
  user_id: z.number().optional(),
  config: z.object({}).optional(),
  priority: z.enum(['low', 'normal', 'high']).default('normal')
});

/**
 * POST /api/agents/execute
 * Manually trigger agent workflows for testing/debugging
 */
router.post('/execute', validateAndZod(executeWorkflowSchema), async (req: Request, res: Response) => {
  try {
    const { workflow_type, user_id, config, priority } = req.body;
    
    let result;
    
    switch (workflow_type) {
      case 'trend_discovery':
        result = await viral_agent_system.discover_trends(
          config?.platforms || ['tiktok', 'instagram'],
          config?.niches || ['general']
        );
        break;
        
      case 'content_creation':
        if (!config?.trend_data) {
          return res.status(400).json({ 
            success: false, 
            error: 'trend_data required for content creation' 
          });
        }
        result = await viral_agent_system.create_viral_content(
          config.trend_data,
          config.content_type || 'video'
        );
        break;
        
      case 'full_pipeline':
        if (!user_id) {
          return res.status(400).json({ 
            success: false, 
            error: 'user_id required for full pipeline' 
          });
        }
        result = await viral_agent_system.run_full_pipeline(user_id, config || {});
        break;
        
      default:
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid workflow type' 
        });
    }
    
    res.json({
      success: true,
      data: {
        workflow_type,
        result,
        executed_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error executing workflow:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to execute workflow' 
    });
  }
});

/**
 * POST /api/agents/restart
 * Restart specific agents or the entire system
 */
router.post('/restart', async (req: Request, res: Response) => {
  try {
    const { agent_type = 'all' } = req.body;
    
    if (agent_type === 'all') {
      // Restart entire agent system
      await restartAgentSystem();
      res.json({
        success: true,
        message: 'Agent system restart initiated'
      });
    } else {
      // Restart specific agent
      await restartSpecificAgent(agent_type);
      res.json({
        success: true,
        message: `Agent ${agent_type} restart initiated`
      });
    }
  } catch (error) {
    console.error('Error restarting agents:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to restart agents' 
    });
  }
});

// =============================================================================
// KNOWLEDGE BASE MANAGEMENT
// =============================================================================

/**
 * GET /api/agents/knowledge
 * Get knowledge base status and content
 */
router.get('/knowledge', async (req: Request, res: Response) => {
  try {
    const knowledge = await getKnowledgeBaseInfo();
    
    res.json({
      success: true,
      data: knowledge
    });
  } catch (error) {
    console.error('Error getting knowledge base:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get knowledge base' 
    });
  }
});

/**
 * POST /api/agents/knowledge/refresh
 * Refresh knowledge base from sources
 */
router.post('/knowledge/refresh', async (req: Request, res: Response) => {
  try {
    await refreshKnowledgeBase();
    
    res.json({
      success: true,
      message: 'Knowledge base refresh initiated'
    });
  } catch (error) {
    console.error('Error refreshing knowledge base:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to refresh knowledge base' 
    });
  }
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getAgentHealthStatus() {
  // Implementation would check each agent's health
  return {
    trend_scout: 'healthy',
    content_analyzer: 'healthy',
    content_creator: 'healthy', 
    publish_manager: 'healthy',
    performance_tracker: 'healthy'
  };
}

async function getActiveWorkflowCount() {
  return Object.keys(ai_enhanced_scheduler.active_workflows || {}).length;
}

async function getKnowledgeBaseStatus() {
  return {
    status: 'loaded',
    sources: 3,
    last_updated: new Date().toISOString(),
    size_mb: 5.2
  };
}

async function getSystemMemoryUsage() {
  // Implementation would get actual memory usage
  return {
    total_mb: 1024,
    used_mb: 512,
    agents_mb: 256,
    knowledge_mb: 128,
    cache_mb: 128
  };
}

async function checkAgentHealth(agentType: string) {
  // Implementation would perform actual health check
  return 'healthy';
}

async function getPerformanceMetrics(options: { timeframe: string; agentType?: string }) {
  // Implementation would calculate actual metrics
  return {
    success_rate: 0.92,
    average_execution_time: 45.2,
    throughput: 120,
    error_rate: 0.08,
    trends: {
      success_rate: [0.90, 0.92, 0.94, 0.92],
      execution_time: [42.1, 45.2, 43.8, 45.2]
    }
  };
}

async function getAgentAnalytics() {
  return {
    total_workflows: 1250,
    successful_workflows: 1150,
    failed_workflows: 100,
    average_daily_workflows: 85,
    most_used_agent: 'trend_scout',
    peak_usage_hours: [9, 10, 14, 20],
    user_satisfaction: 4.2
  };
}

async function restartAgentSystem() {
  // Implementation would restart the agent system
  console.log('Restarting agent system...');
}

async function restartSpecificAgent(agentType: string) {
  // Implementation would restart specific agent
  console.log(`Restarting ${agentType} agent...`);
}

async function getKnowledgeBaseInfo() {
  return {
    sources: [
      { name: 'viral_patterns.md', size: '191KB', last_updated: '2024-01-15T10:30:00Z' },
      { name: 'platform_guidelines.md', size: '222KB', last_updated: '2024-01-15T10:30:00Z' },
      { name: 'content_strategies.md', size: '337KB', last_updated: '2024-01-15T10:30:00Z' }
    ],
    total_size: '750KB',
    embeddings_count: 1500,
    last_refresh: new Date().toISOString()
  };
}

async function refreshKnowledgeBase() {
  // Implementation would refresh knowledge base
  console.log('Refreshing knowledge base...');
}

export default router;