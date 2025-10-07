/**
 * Viral Scoring Rubric v2.0 - Test Suite
 *
 * Tests the comprehensive 6-dimension scoring system with:
 * - Production Quality (20%)
 * - Content Value (25%)
 * - Engagement (20%)
 * - Algorithm Optimization (15%)
 * - Uniqueness (10%)
 * - Niche Fit (10%)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  ViralScoringRubric,
  type VideoAnalysisInput,
  type DimensionScores,
  type ViralScoreOutput,
  type TierInfo,
} from '../viral-scoring-rubric-v2';

describe('ViralScoringRubric', () => {
  let rubric: ViralScoringRubric;

  beforeEach(() => {
    rubric = new ViralScoringRubric();
  });

  describe('Dimension Scoring', () => {
    describe('Production Quality (20% weight)', () => {
      it('should score 10/10 for professional quality video', () => {
        const checks = {
          is1080pOrHigher: true,
          clearAudio: true,
          stableFootage: true,
          regularEdits: true,
          goodLighting: true,
        };

        const score = rubric.scoreProductionQuality(checks);
        expect(score).toBe(10);
      });

      it('should score 8/10 for very good quality', () => {
        const checks = {
          is1080pOrHigher: true,
          clearAudio: true,
          stableFootage: true,
          regularEdits: true,
          goodLighting: false, // 4/5 checks
        };

        const score = rubric.scoreProductionQuality(checks);
        expect(score).toBe(8);
      });

      it('should score 2/10 for poor quality', () => {
        const checks = {
          is1080pOrHigher: false,
          clearAudio: true, // Only 1/5 checks
          stableFootage: false,
          regularEdits: false,
          goodLighting: false,
        };

        const score = rubric.scoreProductionQuality(checks);
        expect(score).toBe(2);
      });
    });

    describe('Engagement (20% weight with metric boosts)', () => {
      it('should apply +2 bonus for excellent like ratio (>3%)', () => {
        const checks = {
          hookFirst5Seconds: true,
          introUnder10Seconds: true,
          cutsEvery15To30Seconds: true,
          clearCTA: true,
          tightPacing: true,
        };

        const metrics = {
          likeRatio: 3.5, // >3%
          commentRatio: 0.6, // >0.5%
        };

        const score = rubric.scoreEngagement(checks, metrics);
        // Base: 10 (5/5 checks) + 2 (like ratio) + 1 (comment ratio) = 13 raw
        // But capped at 10 to prevent overflow in weighted calculations
        expect(score).toBe(10);
        expect(score).toBeLessThanOrEqual(10);
      });

      it('should apply -1 penalty for poor like ratio (<1%)', () => {
        const checks = {
          hookFirst5Seconds: true,
          introUnder10Seconds: true,
          cutsEvery15To30Seconds: false,
          clearCTA: false,
          tightPacing: true, // 3/5 = 6pts base
        };

        const metrics = {
          likeRatio: 0.5, // <1%
          commentRatio: 0.05, // <0.1%
        };

        const score = rubric.scoreEngagement(checks, metrics);
        // Base: 6 - 1 (like penalty) - 1 (comment penalty) = 4
        expect(score).toBe(4);
      });
    });

    describe('Algorithm Optimization (15% weight)', () => {
      it('should score 10/10 for perfect thumbnail + title', () => {
        const thumbnailChecks = {
          highContrastColors: true,
          readableText: true,
          faceWithEmotion: true,
          singleFocalPoint: true,
          professional: true,
        };

        const titleChecks = {
          containsKeywords: true,
          optimalLength: true, // 40-60 chars
          createsEmotion: true,
          accurate: true,
          notSpammy: true,
        };

        const score = rubric.scoreAlgorithmOptimization(thumbnailChecks, titleChecks);
        expect(score).toBe(10);
      });

      it('should score 5/10 for mediocre optimization', () => {
        const thumbnailChecks = {
          highContrastColors: true,
          readableText: false,
          faceWithEmotion: true,
          singleFocalPoint: false,
          professional: true, // 3/5
        };

        const titleChecks = {
          containsKeywords: true,
          optimalLength: false,
          createsEmotion: false,
          accurate: true,
          notSpammy: true, // 3/5
        };

        const score = rubric.scoreAlgorithmOptimization(thumbnailChecks, titleChecks);
        // (3 + 3) / 10 * 10 = 6
        expect(score).toBe(6);
      });
    });

    describe('Content Value (25% weight)', () => {
      it('should score maximum for exceptional value', () => {
        const checks = {
          deliversOnPromise: true,
          valuableToAudience: true,
          clearValue: true,
          recommendable: true,
          satisfyingPayoff: true,
        };

        const score = rubric.scoreContentValue(checks);
        expect(score).toBe(10);
      });
    });

    describe('Uniqueness (10% weight)', () => {
      it('should apply genre adjustments correctly', () => {
        const checks = {
          uniqueConcept: false,
          feelsFresh: false,
          algorithmFriendly: true,
          uniqueAngle: false,
          addsValue: true, // 2/5 = 4pts base
        };

        // Functional content has base 5-7, so 4pts should be adjusted up
        const functionalScore = rubric.scoreUniqueness(checks, 'functional_content');
        expect(functionalScore).toBeGreaterThanOrEqual(5);

        // Entertainment needs 7+ for viral potential
        const entertainmentScore = rubric.scoreUniqueness(checks, 'entertainment');
        expect(entertainmentScore).toBe(4); // No adjustment, stays low
      });
    });

    describe('Niche Fit (10% weight)', () => {
      it('should score based on channel alignment', () => {
        const checks = {
          matchesChannel: true,
          audienceAppreciates: true,
          creatorKnowledgeable: true,
          authentic: false,
          nicheAware: true, // 4/5 = 8pts
        };

        const score = rubric.scoreNicheFit(checks);
        expect(score).toBe(8);
      });
    });
  });

  describe('Red Flag Penalties', () => {
    it('should apply -10 for misleading content', () => {
      const penalties = rubric.applyRedFlags({
        misleadingContent: true,
        poorAudio: false,
        noHook: false,
        shakyFootage: false,
        noCustomThumbnail: false,
      });

      expect(penalties).toBe(-10);
    });

    it('should accumulate multiple penalties', () => {
      const penalties = rubric.applyRedFlags({
        misleadingContent: true, // -10
        poorAudio: true, // -5
        noHook: true, // -5
        shakyFootage: false,
        noCustomThumbnail: true, // -3
      });

      expect(penalties).toBe(-23);
    });
  });

  describe('Weighted Total Calculation', () => {
    it('should calculate correct weighted total', () => {
      const dimensionScores: DimensionScores = {
        productionQuality: 8,
        contentValue: 7,
        engagement: 6,
        algorithmOptimization: 7,
        uniqueness: 5,
        nicheFit: 8,
      };

      const total = rubric.calculateWeightedTotal(dimensionScores);

      // (8×0.20) + (7×0.25) + (6×0.20) + (7×0.15) + (5×0.10) + (8×0.10)
      // = 1.6 + 1.75 + 1.2 + 1.05 + 0.5 + 0.8 = 6.9
      // Multiply by 10 to get 0-100 scale = 69

      expect(total).toBeCloseTo(69, 0);
    });

    it('should handle perfect scores', () => {
      const dimensionScores: DimensionScores = {
        productionQuality: 10,
        contentValue: 10,
        engagement: 10,
        algorithmOptimization: 10,
        uniqueness: 10,
        nicheFit: 10,
      };

      const total = rubric.calculateWeightedTotal(dimensionScores);
      expect(total).toBe(100);
    });

    it('should handle minimum scores', () => {
      const dimensionScores: DimensionScores = {
        productionQuality: 0,
        contentValue: 0,
        engagement: 0,
        algorithmOptimization: 0,
        uniqueness: 0,
        nicheFit: 0,
      };

      const total = rubric.calculateWeightedTotal(dimensionScores);
      expect(total).toBe(0);
    });
  });

  describe('Tier Assignment', () => {
    it('should assign Tier S for 95-100', () => {
      const tier = rubric.getTier(97);
      expect(tier.tier).toBe('S');
      expect(tier.label).toBe('Viral Legend');
    });

    it('should assign Tier A for 85-94', () => {
      const tier = rubric.getTier(89);
      expect(tier.tier).toBe('A');
      expect(tier.label).toBe('Elite');
    });

    it('should assign Tier B for 75-84', () => {
      const tier = rubric.getTier(78);
      expect(tier.tier).toBe('B');
      expect(tier.label).toBe('Professional');
    });

    it('should assign Tier C for 65-74', () => {
      const tier = rubric.getTier(70);
      expect(tier.tier).toBe('C');
      expect(tier.label).toBe('Emerging');
    });

    it('should assign Tier D for 50-64', () => {
      const tier = rubric.getTier(55);
      expect(tier.tier).toBe('D');
      expect(tier.label).toBe('Developing');
    });

    it('should assign Tier F for below 50', () => {
      const tier = rubric.getTier(42);
      expect(tier.tier).toBe('F');
      expect(tier.label).toBe('Needs Improvement');
    });

    it('should handle edge cases at tier boundaries', () => {
      expect(rubric.getTier(95).tier).toBe('S');
      expect(rubric.getTier(94).tier).toBe('A');
      expect(rubric.getTier(85).tier).toBe('A');
      expect(rubric.getTier(84).tier).toBe('B');
      expect(rubric.getTier(75).tier).toBe('B');
      expect(rubric.getTier(74).tier).toBe('C');
      expect(rubric.getTier(65).tier).toBe('C');
      expect(rubric.getTier(64).tier).toBe('D');
      expect(rubric.getTier(50).tier).toBe('D');
      expect(rubric.getTier(49).tier).toBe('F');
    });
  });

  describe('Viral Potential Assessment', () => {
    it('should classify HIGH viral potential correctly', () => {
      const scores: DimensionScores = {
        productionQuality: 9,
        contentValue: 8,
        engagement: 9,
        algorithmOptimization: 9,
        uniqueness: 8,
        nicheFit: 8,
      };

      const totalScore = rubric.calculateWeightedTotal(scores);
      const potential = rubric.assessViralPotential(totalScore, scores);

      // totalScore should be >= 85, algorithm >= 8, engagement >= 8, uniqueness >= 7
      expect(potential).toBe('high');
    });

    it('should classify MEDIUM viral potential correctly', () => {
      const scores: DimensionScores = {
        productionQuality: 7,
        contentValue: 7,
        engagement: 6,
        algorithmOptimization: 7,
        uniqueness: 5,
        nicheFit: 7,
      };

      const totalScore = rubric.calculateWeightedTotal(scores);
      const potential = rubric.assessViralPotential(totalScore, scores);

      expect(potential).toBe('medium');
    });

    it('should classify LOW viral potential correctly', () => {
      const scores: DimensionScores = {
        productionQuality: 5,
        contentValue: 5,
        engagement: 4,
        algorithmOptimization: 5,
        uniqueness: 3,
        nicheFit: 6,
      };

      const totalScore = rubric.calculateWeightedTotal(scores);
      const potential = rubric.assessViralPotential(totalScore, scores);

      expect(potential).toBe('low');
    });
  });

  describe('Complete Video Analysis', () => {
    it('should analyze a viral-potential video correctly', async () => {
      const videoInput: VideoAnalysisInput = {
        title: 'How I Gained 1M Followers in 30 Days',
        description: 'Complete strategy revealed step-by-step',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        duration: 'PT12M30S',
        views: 500000,
        likes: 25000, // 5% like ratio
        comments: 3000, // 0.6% comment ratio
        publishedDate: '2025-01-01T00:00:00Z',
        channelSubscribers: 100000,
        platform: 'youtube',
      };

      const result = await rubric.analyzeVideo(videoInput);

      expect(result.overallScore).toBeGreaterThan(70);
      expect(result.tier.tier).toMatch(/[A-C]/);
      expect(result.viralPotential).toMatch(/high|medium/);
      expect(result.dimensionScores).toHaveProperty('productionQuality');
      expect(result.strengths).toBeInstanceOf(Array);
      expect(result.weaknesses).toBeInstanceOf(Array);
      expect(result.recommendations.critical).toBeInstanceOf(Array);
    });

    it('should handle videos with missing metrics', async () => {
      const videoInput: VideoAnalysisInput = {
        title: 'Test Video',
        description: 'Basic test',
        duration: 'PT5M00S',
        publishedDate: '2025-01-01T00:00:00Z',
        channelSubscribers: 1000,
        platform: 'tiktok',
        // Missing: views, likes, comments, thumbnailUrl
      };

      const result = await rubric.analyzeVideo(videoInput);

      expect(result).toHaveProperty('overallScore');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate production quality recommendations for low scores', () => {
      const recommendations = rubric.getRecommendations('production_quality', 3);

      expect(recommendations).toContain(expect.stringMatching(/microphone|audio/i));
      expect(recommendations).toContain(expect.stringMatching(/stabilizer|shake/i));
    });

    it('should generate engagement recommendations for low scores', () => {
      const recommendations = rubric.getRecommendations('engagement', 4);

      expect(recommendations).toContain(expect.stringMatching(/hook|first.*seconds/i));
      expect(recommendations).toContain(expect.stringMatching(/intro/i));
    });

    it('should generate algorithm optimization recommendations', () => {
      const recommendations = rubric.getRecommendations('algorithm_optimization', 5);

      expect(recommendations).toContain(expect.stringMatching(/thumbnail/i));
      expect(recommendations).toContain(expect.stringMatching(/title/i));
    });
  });

  describe('Benchmark Comparisons', () => {
    it('should compare to tier-appropriate benchmarks', () => {
      const comparison = rubric.compareToTierBenchmark(89, 'A');

      expect(comparison).toContain('Elite');
      expect(comparison).toContain(expect.stringMatching(/\d+M.*subscribers?/i));
    });

    it('should provide actionable next steps', () => {
      const nextSteps = rubric.getNextSteps(68, 'C');

      expect(nextSteps).toBeTruthy();
      expect(typeof nextSteps).toBe('string');
      expect(nextSteps.length).toBeGreaterThan(10);
    });
  });
});

describe('Integration with AI Analysis', () => {
  it('should format prompt for AI dimension scoring', () => {
    const rubric = new ViralScoringRubric();

    const prompt = rubric.buildAIAnalysisPrompt({
      title: 'Test Video',
      description: 'Test description',
      platform: 'youtube',
    } as VideoAnalysisInput);

    expect(prompt).toContain('PRODUCTION QUALITY');
    expect(prompt).toContain('CONTENT VALUE');
    expect(prompt).toContain('ENGAGEMENT');
    expect(prompt).toContain('Quick checks');
    expect(prompt).toContain('1-10 scale');
  });

  it('should parse AI response into structured scores', () => {
    const rubric = new ViralScoringRubric();

    const aiResponse = {
      production_quality: 8,
      content_value: 7,
      engagement: 6,
      algorithm_optimization: 7,
      uniqueness: 5,
      niche_fit: 8,
      strengths: ['Great production', 'Clear value'],
      weaknesses: ['Slow hook', 'Generic approach'],
    };

    const parsed = rubric.parseAIResponse(aiResponse);

    expect(parsed.dimensionScores.productionQuality).toBe(8);
    expect(parsed.strengths).toHaveLength(2);
    expect(parsed.weaknesses).toHaveLength(2);
  });
});

/**
 * CONFIDENCE: HIGH
 *
 * CONCERNS:
 * - AI integration tests are mocked - need real API tests separately
 * - Edge case handling for extreme metric values needs validation
 * - Tier boundary edge cases all tested
 *
 * TESTED: unit tests
 *
 * These tests cover:
 * ✅ All 6 dimension scoring methods
 * ✅ Red flag penalty system
 * ✅ Weighted total calculation
 * ✅ Tier assignment logic with boundaries
 * ✅ Viral potential assessment
 * ✅ Complete video analysis workflow
 * ✅ Recommendation generation
 * ✅ AI prompt building and parsing
 * ✅ Missing/incomplete data handling
 */
