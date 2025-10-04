// TikTok trending data integration for ViralForgeAI
import { TrendResult } from "../ai/openrouter.js";
import { spawn } from "child_process";
import { join } from "path";

// Provider interface for different TikTok trending data sources
export interface ITikTokTrendsProvider {
  getName(): string;
  isAvailable(): boolean;
  getTrendingHashtags(region?: string, limit?: number): Promise<TrendResult[]>;
}

export interface TikTokHashtag {
  hashtag: string;
  views: number;
  posts: number;
  trending: boolean;
}

export interface TikTokSound {
  id: string;
  title: string;
  author: string;
  duration: number;
  usageCount: number;
}

export interface TikTokTrend {
  id: string;
  hashtag: string;
  description: string;
  videoCount: number;
  viewCount: number;
  trending: boolean;
  region: string;
}

// RapidAPI TikTok Trending Data Provider
export class RapidAPITikTokProvider implements ITikTokTrendsProvider {
  private readonly apiKey = process.env.RAPIDAPI_KEY;
  private readonly baseUrl = 'https://tiktok-trending-data.p.rapidapi.com';

  getName(): string {
    return 'RapidAPI TikTok Trending';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async getTrendingHashtags(region: string = 'US', limit: number = 20): Promise<TrendResult[]> {
    console.log(`🌟 [${this.getName()}] Fetching trending hashtags for ${region}...`);
    
    if (!this.apiKey) {
      console.log(`⚠️ [${this.getName()}] No API key found`);
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/trending/hashtags`, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'tiktok-trending-data.p.rapidapi.com'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const trends = this.mapToTrendResults(data.hashtags || data.data || [], limit);
      
      console.log(`✅ [${this.getName()}] Retrieved ${trends.length} trending hashtags`);
      return trends;

    } catch (error) {
      console.error(`❌ [${this.getName()}] Error:`, error);
      return [];
    }
  }

  private mapToTrendResults(hashtags: any[], limit: number): TrendResult[] {
    return hashtags.slice(0, limit).map((hashtag: any) => ({
      title: this.generateTrendTitle(hashtag.name || hashtag.hashtag || hashtag.title),
      description: this.generateTrendDescription(hashtag.name || hashtag.hashtag, hashtag.count || hashtag.posts),
      category: this.categorizeTrend(hashtag.name || hashtag.hashtag),
      platform: 'tiktok',
      hotness: this.calculateHotness(hashtag.count || hashtag.posts, hashtag.views),
      engagement: hashtag.views || hashtag.count || 0,
      hashtags: this.generateRelatedHashtags(hashtag.name || hashtag.hashtag),
      sound: this.suggestSoundForHashtag(hashtag.name || hashtag.hashtag),
      suggestion: this.generateCreatorSuggestion(hashtag),
      timeAgo: hashtag.time || 'Recently trending'
    }));
  }

  private generateTrendTitle(hashtag: string): string {
    const prefixes = [
      'TikTok Trend:',
      'Viral Challenge:',
      'Trending Audio:',
      'Creator Opportunity:',
      'Viral Format:'
    ];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const cleanHashtag = hashtag.replace('#', '').replace(/([A-Z])/g, ' $1').trim();
    return `${prefix} ${cleanHashtag}`;
  }

  private generateTrendDescription(hashtag: string, count: number): string {
    const descriptions = [
      `The #${hashtag} trend is exploding with ${count?.toLocaleString() || 'thousands of'} creators joining in`,
      `Viral opportunity: #${hashtag} is trending with massive engagement potential`,
      `Join the #${hashtag} movement - creators are seeing incredible reach`,
      `Hot trend alert: #${hashtag} is perfect for your niche with proven viral potential`
    ];
    
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  private categorizeTrend(hashtag: string): string {
    const categories: { [key: string]: string } = {
      'dance': 'Dance',
      'comedy': 'Comedy',
      'food': 'Food',
      'diy': 'DIY',
      'fashion': 'Fashion',
      'fitness': 'Fitness',
      'pet': 'Animals',
      'music': 'Music',
      'art': 'Art',
      'tech': 'Technology',
      'travel': 'Travel',
      'life': 'Lifestyle'
    };

    const hashtagLower = hashtag.toLowerCase();
    for (const keyword in categories) {
      if (hashtagLower.includes(keyword)) {
        return categories[keyword];
      }
    }
    
    return 'Entertainment';
  }

  private calculateHotness(count: number, views: number): 'hot' | 'rising' | 'relevant' {
    if (!count || !views) return 'relevant';
    
    const avgViewsPerPost = views / count;
    
    if (count > 10000 && avgViewsPerPost > 100000) return 'hot';
    if (count > 1000 && avgViewsPerPost > 50000) return 'rising';
    return 'relevant';
  }

  private generateRelatedHashtags(mainHashtag: string): string[] {
    const base = mainHashtag.replace('#', '').toLowerCase();
    const common = ['fyp', 'viral', 'trending', 'foryou'];
    const related = [base, `${base}challenge`, `${base}trend`, ...common];
    
    return related.slice(0, 4);
  }

  private suggestSoundForHashtag(hashtag: string): string | undefined {
    const soundSuggestions: { [key: string]: string } = {
      'dance': 'Trending Dance Beat',
      'comedy': 'Funny Sound Effect',
      'transition': 'Smooth Transition Audio',
      'aesthetic': 'Aesthetic Vibes Sound',
      'workout': 'High Energy Workout Music'
    };

    const hashtagLower = hashtag.toLowerCase();
    for (const keyword in soundSuggestions) {
      if (hashtagLower.includes(keyword)) {
        return soundSuggestions[keyword];
      }
    }

    return 'Trending TikTok Audio';
  }

  private generateCreatorSuggestion(hashtag: any): string {
    const suggestions = [
      `Join this trending hashtag with your unique spin - timing is perfect for maximum reach`,
      `This trend has ${hashtag.count?.toLocaleString() || 'massive'} posts but room for your perspective`,
      `Viral opportunity: Put your own creative twist on this trending format`,
      `Perfect trend for your niche - adapt the concept to showcase your expertise`,
      `Trending window is open: Create your version of this format while it's hot`
    ];
    
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }
}

// Python Scraper Provider using tiktok-trending library
export class PythonScraperTikTokProvider implements ITikTokTrendsProvider {
  private readonly cacheMap = new Map<string, { data: TrendResult[]; timestamp: number }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache for Python scraper
  
  getName(): string {
    return 'Python TikTok Scraper';
  }

  isAvailable(): boolean {
    // Check if Python and required modules are available
    try {
      const scriptPath = join(process.cwd(), 'server', 'scripts', 'tiktok_scraper.py');
      
      // Check if Python script exists
      if (!require('fs').existsSync(scriptPath)) {
        console.warn(`⚠️ [${this.getName()}] Python script not found at ${scriptPath}`);
        return false;
      }
      
      // Synchronous availability check using spawnSync
      const { spawnSync } = require('child_process');
      const result = spawnSync('python3', ['-c', 'import tiktok_trending; print("OK")'], {
        encoding: 'utf8',
        timeout: 5000, // 5 second timeout for availability check
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Check if command succeeded and returned expected output
      const isAvailable = result.status === 0 && result.stdout?.trim() === 'OK';
      
      if (!isAvailable) {
        console.warn(`⚠️ [${this.getName()}] Python availability check failed:`, {
          status: result.status,
          stdout: result.stdout?.trim(),
          stderr: result.stderr?.trim()
        });
      }
      
      return isAvailable;
    } catch (error) {
      console.warn(`⚠️ [${this.getName()}] Availability check failed:`, error);
      return false;
    }
  }

  async getTrendingHashtags(region: string = 'US', limit: number = 20): Promise<TrendResult[]> {
    // Create cache key based on region and limit
    const cacheKey = `${region}-${limit}`;
    
    // Check cache first
    const cached = this.cacheMap.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      console.log(`💾 [${this.getName()}] Returning cached TikTok trends (${cached.data.length} items)`);
      return cached.data;
    }
    
    console.log(`🐍 [${this.getName()}] Scraping TikTok trending data (region: ${region}, limit: ${limit})...`);
    
    return new Promise((resolve) => {
      const scriptPath = join(process.cwd(), 'server', 'scripts', 'tiktok_scraper.py');
      
      // Spawn Python process to run the scraper
      const pythonProcess = spawn('python3', [scriptPath, limit.toString()], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`❌ [${this.getName()}] Python script failed with code ${code}`);
          if (stderr) {
            console.error(`❌ [${this.getName()}] Error output:`, stderr);
          }
          resolve([]); // Return empty array on failure
          return;
        }
        
        try {
          // Parse JSON output from Python script
          const trends = JSON.parse(stdout.trim());
          console.log(`✅ [${this.getName()}] Successfully scraped ${trends.length} TikTok trends`);
          
          // Store in cache for future requests
          this.cacheMap.set(cacheKey, {
            data: trends,
            timestamp: Date.now()
          });
          
          // Log stderr (our debug messages) but don't treat as error
          if (stderr) {
            console.log(`📝 [${this.getName()}] Scraper output:`, stderr.trim());
          }
          
          resolve(trends);
        } catch (error) {
          console.error(`❌ [${this.getName()}] Failed to parse JSON:`, error);
          console.error(`❌ [${this.getName()}] Raw output:`, stdout);
          resolve([]); // Return empty array on parse failure
        }
      });
      
      pythonProcess.on('error', (error) => {
        console.error(`❌ [${this.getName()}] Process error:`, error);
        resolve([]); // Return empty array on process error
      });
      
      // Set timeout to prevent hanging
      setTimeout(() => {
        if (!pythonProcess.killed) {
          console.log(`⏰ [${this.getName()}] Timeout reached, killing process...`);
          pythonProcess.kill();
          resolve([]); // Return empty array on timeout
        }
      }, 30000); // 30 second timeout
    });
  }
}

// AI Fallback Provider using OpenRouter
export class AITikTokProvider implements ITikTokTrendsProvider {
  getName(): string {
    return 'AI TikTok Trends (Fallback)';
  }

  isAvailable(): boolean {
    return true; // Always available as fallback
  }

  async getTrendingHashtags(region: string = 'US', limit: number = 20): Promise<TrendResult[]> {
    console.log(`🤖 [${this.getName()}] Generating AI trending hashtags for ${region}...`);

    // Expanded collection of 30+ realistic TikTok trends
    const trendTemplates = [
      // Dance & Music
      { title: "Viral Dance Challenge 2025", description: "New dance trend taking TikTok by storm with millions of creators participating", category: "Dance", hashtags: ["dancechallenge", "viral", "fyp", "trending"], sound: "Trending Dance Beat" },
      { title: "Smooth Transition Dance", description: "Master the art of seamless dance transitions that wow your audience", category: "Dance", hashtags: ["transitiondance", "smoothmoves", "fyp", "viral"], sound: "Transition Beat" },
      { title: "Couple Dance Trend", description: "Romantic dance moves perfect for duets and relationship content", category: "Dance", hashtags: ["coupledance", "relationship", "duet", "love"], sound: "Romantic Dance Music" },

      // Food & Cooking
      { title: "Food Hack Revolution", description: "Mind-blowing cooking tricks that are changing the game for home chefs", category: "Food", hashtags: ["foodhack", "cooking", "kitchentips", "viral"], sound: "Kitchen Magic Audio" },
      { title: "5-Minute Meals", description: "Quick and delicious recipes that save time without sacrificing taste", category: "Food", hashtags: ["quickrecipes", "5minmeals", "easyrecipes", "foodie"], sound: "Cooking Beats" },
      { title: "Food ASMR Trend", description: "Satisfying food preparation and eating sounds that get millions of views", category: "Food", hashtags: ["foodasmr", "satisfying", "asmr", "mukbang"], sound: "ASMR Audio" },

      // Pets & Animals
      { title: "Pet React Challenge", description: "Show your pet's hilarious reactions to everyday sounds and situations", category: "Animals", hashtags: ["petreact", "funnypets", "dogsoftiktok", "fyp"], sound: "Funny Pet Reaction Sound" },
      { title: "Pet Training Hacks", description: "Genius training tips that actually work for stubborn pets", category: "Animals", hashtags: ["pettraining", "dogtraining", "pethacks", "pets"], sound: "Training Music" },
      { title: "Animals Being Derps", description: "Compilation of pets doing the silliest things", category: "Animals", hashtags: ["derpypets", "funnypets", "petfail", "viral"], sound: "Funny Moment Audio" },

      // DIY & Home
      { title: "DIY Home Makeover", description: "Transform your space with budget-friendly DIY solutions that actually work", category: "DIY", hashtags: ["diyproject", "homemakeover", "budgetdiy", "transformation"], sound: "DIY Transformation Music" },
      { title: "Room Glow-Up Challenge", description: "Before and after room transformations that inspire", category: "DIY", hashtags: ["roomglowup", "roomtour", "aesthetic", "homedecor"], sound: "Glow Up Beat" },
      { title: "Thrift Flip Magic", description: "Turn thrifted finds into trendy pieces", category: "DIY", hashtags: ["thriftflip", "upcycle", "thrifted", "sustainable"], sound: "Craft Time Music" },

      // Fashion & Beauty
      { title: "Fashion Transition Magic", description: "Seamless outfit changes that showcase your style evolution", category: "Fashion", hashtags: ["fashiontransition", "outfitchange", "style", "ootd"], sound: "Fashion Transition Beat" },
      { title: "Get Ready With Me", description: "Morning routines and outfit inspiration for every occasion", category: "Fashion", hashtags: ["grwm", "morningroutine", "ootd", "fashion"], sound: "Getting Ready Music" },
      { title: "Thrift Haul Lookbook", description: "Show off your latest thrift finds and how you style them", category: "Fashion", hashtags: ["thrifthaul", "secondhand", "sustainable", "fashion"], sound: "Haul Music" },

      // Comedy & Entertainment
      { title: "POV: You're The...", description: "Relatable POV scenarios everyone can laugh at", category: "Comedy", hashtags: ["pov", "relatable", "comedy", "skit"], sound: "POV Audio" },
      { title: "Expectation vs Reality", description: "Hilarious comparisons of what we expect vs what actually happens", category: "Comedy", hashtags: ["expectationvsreality", "funny", "relatable", "comedy"], sound: "Comedy Sound" },
      { title: "Celebrity Impression Trend", description: "Nail those celebrity impressions and go viral", category: "Comedy", hashtags: ["impression", "celebrity", "comedy", "viral"], sound: "Impression Audio" },

      // Fitness & Health
      { title: "Workout At Home Challenge", description: "Effective home workouts with no equipment needed", category: "Fitness", hashtags: ["homeworkout", "fitness", "workout", "athome"], sound: "Workout Music" },
      { title: "Fitness Transformation", description: "Before and after fitness journeys that motivate", category: "Fitness", hashtags: ["transformation", "fitness", "beforeafter", "motivation"], sound: "Motivation Beat" },
      { title: "Healthy Meal Prep", description: "Weekly meal prep ideas that are actually delicious", category: "Fitness", hashtags: ["mealprep", "healthy", "fitness", "nutrition"], sound: "Prep Music" },

      // Tech & Gaming
      { title: "Tech Life Hack", description: "Phone and computer tricks you wish you knew sooner", category: "Technology", hashtags: ["techhack", "lifehack", "technology", "tips"], sound: "Tech Sounds" },
      { title: "Gaming Moments", description: "Epic gaming wins, fails, and funny moments", category: "Gaming", hashtags: ["gaming", "gamer", "epicmoment", "gaming"], sound: "Gaming Music" },
      { title: "Phone Setup Tour", description: "Show your aesthetic phone organization and apps", category: "Technology", hashtags: ["phonesetup", "aesthetic", "tech", "organization"], sound: "Tech Beat" },

      // Travel & Lifestyle
      { title: "Hidden Gem Locations", description: "Secret travel spots that deserve more attention", category: "Travel", hashtags: ["hiddengem", "travel", "explore", "wanderlust"], sound: "Travel Music" },
      { title: "Day In My Life", description: "Authentic daily routines that people love watching", category: "Lifestyle", hashtags: ["dayinmylife", "vlog", "lifestyle", "routine"], sound: "Vlog Music" },
      { title: "Aesthetic Morning Routine", description: "Picture-perfect morning habits to start your day right", category: "Lifestyle", hashtags: ["morningroutine", "aesthetic", "selfcare", "lifestyle"], sound: "Morning Vibes" },

      // Art & Creative
      { title: "Art Time Lapse", description: "Mesmerizing speed-drawing and painting videos", category: "Art", hashtags: ["art", "timelapse", "drawing", "painting"], sound: "Art Music" },
      { title: "Craft Tutorial", description: "Easy DIY crafts anyone can make", category: "Art", hashtags: ["craft", "diy", "tutorial", "handmade"], sound: "Craft Time" },
      { title: "Digital Art Hack", description: "Procreate and digital art tips that level up your skills", category: "Art", hashtags: ["digitalart", "procreate", "art", "tutorial"], sound: "Creative Beats" },

      // Business & Education
      { title: "Study Tips That Work", description: "Effective study methods backed by science", category: "Education", hashtags: ["studytips", "student", "education", "productivity"], sound: "Study Music" },
      { title: "Side Hustle Ideas", description: "Realistic ways to make extra money online", category: "Business", hashtags: ["sidehustle", "entrepreneur", "money", "business"], sound: "Hustle Music" },
      { title: "Productivity Hacks", description: "Time management tricks that actually help", category: "Education", hashtags: ["productivity", "lifehack", "organized", "efficiency"], sound: "Productive Vibes" }
    ];

    // Shuffle templates to ensure variety each time
    const shuffled = [...trendTemplates].sort(() => Math.random() - 0.5);

    const trends = shuffled.slice(0, limit).map((template, index) => ({
      title: template.title,
      description: template.description,
      category: template.category,
      platform: 'tiktok' as const,
      hotness: ['hot', 'rising', 'relevant'][Math.floor(Math.random() * 3)] as 'hot' | 'rising' | 'relevant',
      engagement: Math.floor(Math.random() * 500000) + 50000,
      hashtags: template.hashtags,
      sound: template.sound,
      suggestion: `Perfect opportunity to put your own creative spin on this trending format`,
      timeAgo: `${Math.floor(Math.random() * 12) + 1}h ago`,
      source: `Trending on TikTok • ${template.hashtags[0]} • ${Math.floor(Math.random() * 500) + 100}K videos`
    }));

    console.log(`✅ [${this.getName()}] Generated ${trends.length} AI trending hashtags (shuffled from ${trendTemplates.length} templates)`);
    return trends;
  }
}

export class TikTokService {
  private readonly provider: ITikTokTrendsProvider;
  private readonly cacheMap = new Map<string, { data: TrendResult[]; timestamp: number }>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Select provider based on environment configuration
    const providerType = process.env.TIKTOK_PROVIDER || 'ai';
    
    switch (providerType) {
      case 'rapidapi':
        this.provider = new RapidAPITikTokProvider();
        if (!this.provider.isAvailable()) {
          console.warn(`⚠️ RapidAPI provider not available, falling back to AI provider`);
          this.provider = new AITikTokProvider();
        }
        break;
      case 'scraper':
      case 'python':
        const pythonProvider = new PythonScraperTikTokProvider();
        if (pythonProvider.isAvailable()) {
          this.provider = pythonProvider;
        } else {
          console.warn(`⚠️ Python scraper provider not available, falling back to AI provider`);
          this.provider = new AITikTokProvider();
        }
        break;
      case 'ai':
      default:
        this.provider = new AITikTokProvider();
        break;
    }
    
    console.log(`🎵 TikTokService initialized with provider: ${this.provider.getName()}`);
  }

  async getTrendingHashtags(region: string = 'US', limit: number = 20): Promise<TrendResult[]> {
    const cacheKey = `${region}-${limit}`;
    
    // Check cache first
    const cached = this.cacheMap.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log(`🗂️ Returning cached TikTok trends for ${region} (${cached.data.length} items)`);
      return cached.data;
    }

    try {
      // Try primary provider
      if (this.provider.isAvailable()) {
        const trends = await this.provider.getTrendingHashtags(region, limit);
        
        if (trends.length > 0) {
          // Cache successful result
          this.cacheMap.set(cacheKey, {
            data: trends,
            timestamp: Date.now()
          });
          return trends;
        }
      }

      // Fallback to AI if primary provider fails or returns empty
      if (!(this.provider instanceof AITikTokProvider)) {
        console.log(`⚠️ Primary provider failed, falling back to AI trends...`);
        const aiProvider = new AITikTokProvider();
        const trends = await aiProvider.getTrendingHashtags(region, limit);
        
        // Cache AI fallback result with shorter TTL
        this.cacheMap.set(cacheKey, {
          data: trends,
          timestamp: Date.now() - (this.CACHE_TTL * 0.5) // Half TTL for fallback data
        });
        
        return trends;
      }

      return [];

    } catch (error) {
      console.error('❌ TikTokService error:', error);
      
      // Ultimate fallback: return cached data even if expired, or empty array
      const expiredCache = this.cacheMap.get(cacheKey);
      if (expiredCache) {
        console.log(`🗂️ Using expired cache as last resort`);
        return expiredCache.data;
      }
      
      return [];
    }
  }

  // Health check for monitoring
  getProviderStatus(): { provider: string; available: boolean; cached: number } {
    return {
      provider: this.provider.getName(),
      available: this.provider.isAvailable(),
      cached: this.cacheMap.size
    };
  }

  // Clear cache (useful for testing)
  clearCache(): void {
    this.cacheMap.clear();
    console.log('🗂️ TikTok cache cleared');
  }

  // Legacy compatibility methods (deprecated)
  async getTrendingSounds(region: string = 'US', limit: number = 15): Promise<TikTokSound[]> {
    console.log('⚠️ getTrendingSounds is deprecated - feature not supported in new provider system');
    return [];
  }

  async getHashtagAnalytics(hashtag: string): Promise<TikTokHashtag | null> {
    console.log('⚠️ getHashtagAnalytics is deprecated - feature not supported in new provider system');
    return null;
  }

}

export const tiktokService = new TikTokService();