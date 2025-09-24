import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openRouterService } from "./ai/openrouter";
import { insertTrendSchema, insertUserTrendsSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Idea Lab Routes - AI Trend Discovery

  // Discover trends using AI
  app.post("/api/trends/discover", async (req, res) => {
    try {
      const { platform, category, contentType, targetAudience } = req.body;
      
      if (!platform) {
        return res.status(400).json({ error: "Platform is required" });
      }

      console.log(`🔍 Discovering trends for ${platform}...`);
      
      // Use AI to discover trends
      const aiTrends = await openRouterService.discoverTrends({
        platform,
        category,
        contentType,
        targetAudience
      });

      // Store trends in database
      const storedTrends = [];
      for (const trendData of aiTrends) {
        try {
          // Validate trend data
          const validatedTrend = insertTrendSchema.parse(trendData);
          const trend = await storage.createTrend(validatedTrend);
          storedTrends.push(trend);
        } catch (error) {
          console.warn("Failed to store trend:", error);
          // Continue with other trends even if one fails
        }
      }

      console.log(`✅ Discovered and stored ${storedTrends.length} trends`);
      res.json({ trends: storedTrends });
    } catch (error) {
      console.error("Error discovering trends:", error);
      res.status(500).json({ error: "Failed to discover trends" });
    }
  });

  // Get trends (cached or fresh)
  app.get("/api/trends", async (req, res) => {
    try {
      const { platform, limit } = req.query;
      
      const trends = await storage.getTrends(
        platform as string, 
        limit ? parseInt(limit as string) : undefined
      );
      
      res.json({ trends });
    } catch (error) {
      console.error("Error getting trends:", error);
      res.status(500).json({ error: "Failed to get trends" });
    }
  });

  // Get specific trend
  app.get("/api/trends/:id", async (req, res) => {
    try {
      const trendId = parseInt(req.params.id);
      const trend = await storage.getTrend(trendId);
      
      if (!trend) {
        return res.status(404).json({ error: "Trend not found" });
      }
      
      res.json({ trend });
    } catch (error) {
      console.error("Error getting trend:", error);
      res.status(500).json({ error: "Failed to get trend" });
    }
  });

  // Save/like/use a trend (user actions)
  app.post("/api/trends/:id/action", async (req, res) => {
    try {
      const trendId = parseInt(req.params.id);
      const { action, userId } = req.body; // action: "saved", "liked", "used"
      
      if (!userId || !action) {
        return res.status(400).json({ error: "User ID and action are required" });
      }

      if (!["saved", "liked", "used"].includes(action)) {
        return res.status(400).json({ error: "Invalid action" });
      }

      // Check if trend exists
      const trend = await storage.getTrend(trendId);
      if (!trend) {
        return res.status(404).json({ error: "Trend not found" });
      }

      // Record the action
      const userTrendData = insertUserTrendsSchema.parse({
        userId,
        trendId,
        action
      });

      const userTrend = await storage.createUserTrendAction(userTrendData);
      
      console.log(`✅ User ${userId} ${action} trend ${trendId}`);
      res.json({ success: true, userTrend });
    } catch (error) {
      console.error("Error recording trend action:", error);
      res.status(500).json({ error: "Failed to record trend action" });
    }
  });

  // Get user's saved/liked trends
  app.get("/api/users/:userId/trends", async (req, res) => {
    try {
      const { userId } = req.params;
      const { action } = req.query; // "saved", "liked", "used"
      
      const userTrends = await storage.getUserTrendActions(userId, action as string);
      
      // Get full trend details
      const trendsWithDetails = [];
      for (const userTrend of userTrends) {
        const trend = await storage.getTrend(userTrend.trendId);
        if (trend) {
          trendsWithDetails.push({
            ...trend,
            userAction: userTrend.action,
            actionDate: userTrend.createdAt
          });
        }
      }
      
      res.json({ trends: trendsWithDetails });
    } catch (error) {
      console.error("Error getting user trends:", error);
      res.status(500).json({ error: "Failed to get user trends" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      service: "CreatorKit AI Backend"
    });
  });

  const httpServer = createServer(app);

  return httpServer;
}
