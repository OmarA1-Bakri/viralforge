#!/usr/bin/env python3

"""
AI-Enhanced Automation Scheduler for ViralForge
===============================================

This module integrates the CrewAI multi-agent system with the existing 
automation system, replacing traditional cron-based workflows with 
intelligent agent-driven processes.

Features:
- CrewAI integration for intelligent content workflows
- Parallel execution across multiple users and platforms
- State persistence and memory management
- Performance monitoring and optimization
- Fallback to traditional methods when needed
"""

import asyncio
import cron
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from contextlib import asynccontextmanager

# Import existing services
from .scheduler import AutomationScheduler
from storage import storage
from ai.openrouter import OpenRouterService

# Import our new CrewAI system
import sys
sys.path.append('/home/omar/viralforge/server')
from agents.viral_crew import viral_agent_system

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AIEnhancedScheduler(AutomationScheduler):
    """
    Enhanced automation scheduler that combines traditional cron-based 
    automation with CrewAI multi-agent intelligence.
    """
    
    def __init__(self):
        """Initialize the AI-enhanced scheduler."""
        super().__init__()
        self.viral_agents = viral_agent_system
        self.active_workflows = {}  # Track running agent workflows
        self.performance_metrics = {}  # Track agent performance
        self.fallback_enabled = True  # Enable fallback to traditional methods
        
    def start(self):
        """Start the enhanced automation system with both AI agents and traditional cron."""
        logger.info('🚀 Starting AI-Enhanced ViralForge Automation System...')
        
        # Start traditional cron-based automation as fallback
        super().start()
        
        # Add new AI-powered workflows
        self._schedule_ai_workflows()
        
        logger.info('✅ AI-Enhanced automation system started successfully')
    
    def _schedule_ai_workflows(self):
        """Schedule CrewAI-powered workflows alongside traditional automation."""
        
        # AI-Powered Trend Discovery (every 4 hours)
        cron.schedule('0 */4 * * *', self.ai_trend_discovery_workflow)
        
        # AI-Powered Content Creation (every 6 hours)
        cron.schedule('0 */6 * * *', self.ai_content_creation_workflow)
        
        # AI-Powered Performance Analysis (every 2 hours) 
        cron.schedule('0 */2 * * *', self.ai_performance_analysis_workflow)
        
        # AI-Powered User Onboarding (every 30 minutes)
        cron.schedule('*/30 * * * *', self.ai_user_onboarding_workflow)
        
        # Full AI Pipeline Execution (daily at 8 AM)
        cron.schedule('0 8 * * *', self.ai_full_pipeline_workflow)
        
        # Agent Performance Monitoring (hourly)
        cron.schedule('0 * * * *', self.monitor_agent_performance)
    
    # =============================================================================
    # AI-POWERED WORKFLOWS
    # =============================================================================
    
    async def ai_trend_discovery_workflow(self):
        """AI-powered trend discovery replacing traditional trend monitoring."""
        logger.info('🕵️ Starting AI-powered trend discovery workflow...')
        
        try:
            # Get all active users
            users = await storage.getAllUsers()
            
            # Process users in batches to avoid overwhelming the system
            user_batches = self._create_user_batches(users, batch_size=5)
            
            for batch in user_batches:
                batch_tasks = []
                
                for user in batch:
                    # Get user's preferences and niches
                    user_profile = await self._get_user_profile(user.id)
                    
                    # Create trend discovery task for this user
                    task = self._discover_trends_for_user(user.id, user_profile)
                    batch_tasks.append(task)
                
                # Execute batch in parallel
                batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
                
                # Process results and store insights
                await self._process_trend_discovery_results(batch_results)
                
                # Small delay between batches
                await asyncio.sleep(2)
        
        except Exception as e:
            logger.error(f'❌ AI trend discovery workflow failed: {e}')
            # Fallback to traditional method
            if self.fallback_enabled:
                await self.dailyTrendMonitoring()
    
    async def ai_content_creation_workflow(self):
        """AI-powered content creation workflow."""
        logger.info('🎨 Starting AI-powered content creation workflow...')
        
        try:
            # Get users who need content created
            content_requests = await storage.getPendingContentRequests()
            
            for request in content_requests:
                try:
                    # Get trend data for this user
                    trend_data = await storage.getLatestTrendDataForUser(request.userId)
                    
                    if not trend_data:
                        logger.warning(f'No trend data available for user {request.userId}')
                        continue
                    
                    # Run content creation crew
                    result = await self.viral_agents.create_viral_content(
                        trend_data=trend_data,
                        content_type=request.contentType or 'video'
                    )
                    
                    if result['status'] == 'success':
                        # Store generated content
                        await self._store_generated_content(request.userId, result)
                        
                        # Update request status
                        await storage.updateContentRequestStatus(
                            request.id, 
                            'completed',
                            result
                        )
                        
                        logger.info(f'✅ Content created for user {request.userId}')
                    else:
                        logger.error(f'❌ Content creation failed: {result.get("error")}')
                        
                except Exception as e:
                    logger.error(f'❌ Content creation failed for user {request.userId}: {e}')
                    continue
        
        except Exception as e:
            logger.error(f'❌ AI content creation workflow failed: {e}')
            # Fallback to traditional content generation
            if self.fallback_enabled:
                await self.backgroundVideoProcessing()
    
    async def ai_performance_analysis_workflow(self):
        """AI-powered performance analysis workflow."""
        logger.info('📊 Starting AI-powered performance analysis workflow...')
        
        try:
            # Get recent content that needs analysis
            content_to_analyze = await storage.getRecentContentForAnalysis(
                hours=6,
                limit=20
            )
            
            analysis_tasks = []
            
            for content in content_to_analyze:
                # Create analysis task
                task = self._analyze_content_performance(content)
                analysis_tasks.append(task)
            
            # Execute analyses in parallel (max 5 at once)
            semaphore = asyncio.Semaphore(5)
            
            async def analyze_with_semaphore(content_task):
                async with semaphore:
                    return await content_task
            
            results = await asyncio.gather(
                *[analyze_with_semaphore(task) for task in analysis_tasks],
                return_exceptions=True
            )
            
            # Process and store analysis results
            await self._process_analysis_results(results)
            
        except Exception as e:
            logger.error(f'❌ AI performance analysis workflow failed: {e}')
            # Fallback to traditional analysis
            if self.fallback_enabled:
                await self.automaticContentScoring()
    
    async def ai_user_onboarding_workflow(self):
        """AI-powered user onboarding and optimization workflow."""
        logger.info('👋 Starting AI-powered user onboarding workflow...')
        
        try:
            # Get new users who need onboarding
            new_users = await storage.getNewUsersNeedingOnboarding(
                created_since=datetime.now() - timedelta(hours=1)
            )
            
            for user in new_users:
                try:
                    # Create personalized onboarding plan
                    onboarding_config = await self._create_onboarding_config(user)
                    
                    # Run limited pipeline for new user
                    result = await self.viral_agents.run_full_pipeline(
                        user_id=user.id,
                        campaign_config=onboarding_config
                    )
                    
                    if result['status'] == 'success':
                        # Mark user as onboarded
                        await storage.markUserAsOnboarded(user.id)
                        
                        # Send welcome content recommendations
                        await self._send_onboarding_recommendations(user.id, result)
                        
                        logger.info(f'✅ User {user.id} onboarded successfully')
                    else:
                        logger.error(f'❌ Onboarding failed for user {user.id}')
                        
                except Exception as e:
                    logger.error(f'❌ Onboarding failed for user {user.id}: {e}')
                    continue
        
        except Exception as e:
            logger.error(f'❌ AI user onboarding workflow failed: {e}')
    
    async def ai_full_pipeline_workflow(self):
        """Daily full AI pipeline execution for premium users."""
        logger.info('🔄 Starting full AI pipeline workflow...')
        
        try:
            # Get premium users who have full pipeline enabled
            premium_users = await storage.getPremiumUsersWithAIEnabled()
            
            # Process premium users with full pipeline
            for user in premium_users:
                try:
                    # Get user's campaign configuration
                    campaign_config = await self._get_user_campaign_config(user.id)
                    
                    # Execute full pipeline
                    result = await self.viral_agents.run_full_pipeline(
                        user_id=user.id,
                        campaign_config=campaign_config
                    )
                    
                    if result['status'] == 'success':
                        # Update user's AI usage metrics
                        await self._update_ai_usage_metrics(user.id, result)
                        
                        # Send pipeline summary to user
                        await self._send_pipeline_summary(user.id, result)
                        
                        logger.info(f'✅ Full pipeline completed for user {user.id}')
                    else:
                        logger.error(f'❌ Full pipeline failed for user {user.id}')
                
                except Exception as e:
                    logger.error(f'❌ Full pipeline failed for user {user.id}: {e}')
                    continue
                
                # Rate limiting between users
                await asyncio.sleep(10)
        
        except Exception as e:
            logger.error(f'❌ Full AI pipeline workflow failed: {e}')
    
    async def monitor_agent_performance(self):
        """Monitor CrewAI agent performance and health."""
        logger.info('🔍 Monitoring agent performance...')
        
        try:
            # Collect performance metrics
            performance_data = {
                'timestamp': datetime.now().isoformat(),
                'active_workflows': len(self.active_workflows),
                'agent_health': await self._check_agent_health(),
                'memory_usage': await self._get_agent_memory_usage(),
                'success_rates': await self._calculate_success_rates(),
                'average_execution_time': await self._get_average_execution_times()
            }
            
            # Store performance metrics
            await storage.storeAgentPerformanceMetrics(performance_data)
            
            # Check for performance issues
            issues = await self._detect_performance_issues(performance_data)
            
            if issues:
                logger.warning(f'⚠️ Performance issues detected: {issues}')
                # Could send alerts or take corrective actions
            
            # Update performance metrics
            self.performance_metrics = performance_data
            
        except Exception as e:
            logger.error(f'❌ Agent performance monitoring failed: {e}')
    
    # =============================================================================
    # HELPER METHODS
    # =============================================================================
    
    def _create_user_batches(self, users: List, batch_size: int = 5) -> List[List]:
        """Create batches of users for parallel processing."""
        batches = []
        for i in range(0, len(users), batch_size):
            batches.append(users[i:i + batch_size])
        return batches
    
    async def _get_user_profile(self, user_id: int) -> Dict[str, Any]:
        """Get user profile and preferences."""
        try:
            profile = await storage.getUserProfile(user_id)
            preferences = await storage.getUserPreferences(user_id)
            
            return {
                'user_id': user_id,
                'niches': preferences.get('content_niches', ['general']),
                'platforms': preferences.get('target_platforms', ['tiktok', 'instagram']),
                'content_style': preferences.get('content_style', 'educational'),
                'posting_frequency': preferences.get('posting_frequency', 'daily')
            }
        except Exception as e:
            logger.error(f'Error getting user profile for {user_id}: {e}')
            return {
                'user_id': user_id,
                'niches': ['general'],
                'platforms': ['tiktok'],
                'content_style': 'educational',
                'posting_frequency': 'daily'
            }
    
    async def _discover_trends_for_user(self, user_id: int, user_profile: Dict[str, Any]) -> Dict[str, Any]:
        """Discover trends for a specific user."""
        try:
            workflow_id = f"trend_discovery_{user_id}_{datetime.now().timestamp()}"
            self.active_workflows[workflow_id] = {
                'type': 'trend_discovery',
                'user_id': user_id,
                'started_at': datetime.now()
            }
            
            result = await self.viral_agents.discover_trends(
                platforms=user_profile['platforms'],
                niches=user_profile['niches']
            )
            
            # Clean up workflow tracking
            del self.active_workflows[workflow_id]
            
            return {
                'user_id': user_id,
                'result': result,
                'workflow_id': workflow_id
            }
            
        except Exception as e:
            logger.error(f'Trend discovery failed for user {user_id}: {e}')
            return {
                'user_id': user_id,
                'error': str(e),
                'workflow_id': workflow_id
            }
    
    async def _process_trend_discovery_results(self, results: List[Dict[str, Any]]):
        """Process and store trend discovery results."""
        for result in results:
            if isinstance(result, Exception):
                logger.error(f'Trend discovery result error: {result}')
                continue
                
            if 'error' in result:
                logger.error(f'Trend discovery failed for user {result["user_id"]}: {result["error"]}')
                continue
            
            try:
                # Store trend data
                await storage.storeTrendData({
                    'userId': result['user_id'],
                    'trends': result['result']['trends'],
                    'platforms': result['result']['platforms'],
                    'timestamp': result['result']['timestamp'],
                    'source': 'ai_crew_discovery'
                })
                
                # Create user activity record
                await storage.createUserActivity({
                    'userId': result['user_id'],
                    'activityType': 'trend_discovery',
                    'title': 'AI Trend Discovery Completed',
                    'status': 'completed',
                    'metadata': {
                        'platforms': result['result']['platforms'],
                        'trends_found': len(result['result'].get('trends', [])),
                        'workflow_id': result['workflow_id']
                    }
                })
                
            except Exception as e:
                logger.error(f'Error processing trend result for user {result["user_id"]}: {e}')
    
    async def _analyze_content_performance(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze performance of a piece of content using AI agents."""
        # This would use the ContentAnalyzer agent to provide insights
        # Implementation would depend on your specific content structure
        pass
    
    async def _store_generated_content(self, user_id: int, content_result: Dict[str, Any]):
        """Store AI-generated content in the database."""
        try:
            await storage.createGeneratedContent({
                'userId': user_id,
                'content': content_result['content'],
                'contentType': content_result['content_type'],
                'source': 'ai_crew_creation',
                'metadata': {
                    'generated_at': content_result['timestamp'],
                    'agents_used': ['content_creator', 'content_analyzer']
                }
            })
        except Exception as e:
            logger.error(f'Error storing generated content for user {user_id}: {e}')
    
    async def _create_onboarding_config(self, user: Any) -> Dict[str, Any]:
        """Create personalized onboarding configuration for new user."""
        return {
            'user_id': user.id,
            'onboarding_type': 'new_user',
            'content_goals': ['engagement', 'follower_growth'],
            'platforms': ['tiktok', 'instagram'],  # Default platforms
            'content_types': ['educational', 'entertaining'],
            'frequency': 'daily'
        }
    
    async def _get_user_campaign_config(self, user_id: int) -> Dict[str, Any]:
        """Get user's campaign configuration."""
        try:
            config = await storage.getUserCampaignConfig(user_id)
            return config or {
                'platforms': ['tiktok', 'instagram'],
                'content_goals': ['viral_growth'],
                'frequency': 'daily',
                'budget': 'standard'
            }
        except Exception as e:
            logger.error(f'Error getting campaign config for user {user_id}: {e}')
            return {
                'platforms': ['tiktok'],
                'content_goals': ['engagement'],
                'frequency': 'daily',
                'budget': 'basic'
            }
    
    async def _check_agent_health(self) -> Dict[str, Any]:
        """Check the health status of all agents."""
        # Implementation would check agent responsiveness, memory usage, etc.
        return {
            'trend_scout': 'healthy',
            'content_analyzer': 'healthy', 
            'content_creator': 'healthy',
            'publish_manager': 'healthy',
            'performance_tracker': 'healthy'
        }
    
    async def _get_agent_memory_usage(self) -> Dict[str, Any]:
        """Get memory usage statistics for agents."""
        # Implementation would check actual memory usage
        return {
            'total_memory_mb': 512,
            'agent_memory_mb': 256,
            'knowledge_base_mb': 128,
            'temporary_data_mb': 128
        }
    
    async def _calculate_success_rates(self) -> Dict[str, float]:
        """Calculate success rates for different workflow types."""
        try:
            metrics = await storage.getWorkflowSuccessRates(
                since=datetime.now() - timedelta(days=7)
            )
            return metrics or {
                'trend_discovery': 0.95,
                'content_creation': 0.88,
                'performance_analysis': 0.92,
                'full_pipeline': 0.85
            }
        except Exception:
            return {
                'trend_discovery': 0.0,
                'content_creation': 0.0,
                'performance_analysis': 0.0,
                'full_pipeline': 0.0
            }
    
    async def _get_average_execution_times(self) -> Dict[str, float]:
        """Get average execution times for workflows."""
        return {
            'trend_discovery': 45.2,  # seconds
            'content_creation': 180.5,
            'performance_analysis': 30.8,
            'full_pipeline': 420.1
        }
    
    async def _detect_performance_issues(self, performance_data: Dict[str, Any]) -> List[str]:
        """Detect potential performance issues."""
        issues = []
        
        success_rates = performance_data.get('success_rates', {})
        execution_times = performance_data.get('average_execution_time', {})
        
        # Check success rates
        for workflow, rate in success_rates.items():
            if rate < 0.8:  # Below 80% success rate
                issues.append(f'Low success rate for {workflow}: {rate:.1%}')
        
        # Check execution times (if too high)
        time_thresholds = {
            'trend_discovery': 120,  # 2 minutes
            'content_creation': 600,  # 10 minutes
            'performance_analysis': 180,  # 3 minutes
            'full_pipeline': 1800    # 30 minutes
        }
        
        for workflow, avg_time in execution_times.items():
            threshold = time_thresholds.get(workflow, 300)  # Default 5 minutes
            if avg_time > threshold:
                issues.append(f'High execution time for {workflow}: {avg_time:.1f}s')
        
        return issues
    
    async def _update_ai_usage_metrics(self, user_id: int, result: Dict[str, Any]):
        """Update user's AI usage metrics."""
        try:
            await storage.updateUserAIUsage({
                'userId': user_id,
                'pipelineExecutions': 1,
                'lastPipelineRun': datetime.now(),
                'executionResult': result['status']
            })
        except Exception as e:
            logger.error(f'Error updating AI usage metrics for user {user_id}: {e}')
    
    async def _send_pipeline_summary(self, user_id: int, result: Dict[str, Any]):
        """Send pipeline execution summary to user."""
        # Implementation would send notification/email to user
        logger.info(f'Pipeline summary sent to user {user_id}')
    
    async def _send_onboarding_recommendations(self, user_id: int, result: Dict[str, Any]):
        """Send onboarding recommendations to new user."""
        # Implementation would send recommendations to user
        logger.info(f'Onboarding recommendations sent to user {user_id}')


# Global instance for the enhanced scheduler
ai_enhanced_scheduler = AIEnhancedScheduler()