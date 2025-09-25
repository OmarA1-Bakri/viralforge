import type { Express, Request, Response } from "express";
import { notificationService } from "../automation/notifications";
import { workflowTriggers } from "../automation/triggers";

export function registerAutomationRoutes(app: Express) {
  
  // Get user notifications
  app.get("/api/notifications", async (req: Request, res: Response) => {
    try {
      const userId = "demo-user"; // TODO: Get from session
      const notifications = await notificationService.getUserNotifications(userId, 20);
      
      res.json({
        success: true,
        notifications,
        unreadCount: notifications.filter(n => n.metadata?.priority === 'high').length
      });
    } catch (error) {
      console.error("❌ Failed to get notifications:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to load notifications" 
      });
    }
  });

  // Trigger workflow when content is uploaded
  app.post("/api/automation/content-uploaded", async (req: Request, res: Response) => {
    try {
      const userId = "demo-user"; // TODO: Get from session
      const { title, description, platform, contentType, filePath } = req.body;

      const result = await workflowTriggers.onContentUploaded(userId, {
        title,
        description,
        platform,
        contentType,
        filePath
      });

      res.json({
        success: true,
        message: "Content upload automation triggered",
        result
      });
    } catch (error) {
      console.error("❌ Content upload automation failed:", error);
      res.status(500).json({ 
        success: false, 
        error: "Automation failed" 
      });
    }
  });

  // Trigger when user saves a trend
  app.post("/api/automation/trend-saved", async (req: Request, res: Response) => {
    try {
      const userId = "demo-user"; // TODO: Get from session
      const { trendId, trendTitle } = req.body;

      await workflowTriggers.onTrendSaved(userId, trendId, trendTitle);

      res.json({
        success: true,
        message: "Trend save automation triggered"
      });
    } catch (error) {
      console.error("❌ Trend save automation failed:", error);
      res.status(500).json({ 
        success: false, 
        error: "Automation failed" 
      });
    }
  });

  // Manual performance check trigger
  app.post("/api/automation/check-performance", async (req: Request, res: Response) => {
    try {
      const userId = "demo-user"; // TODO: Get from session
      
      await workflowTriggers.checkPerformanceAlerts(userId);

      res.json({
        success: true,
        message: "Performance check completed"
      });
    } catch (error) {
      console.error("❌ Performance check failed:", error);
      res.status(500).json({ 
        success: false, 
        error: "Performance check failed" 
      });
    }
  });

}