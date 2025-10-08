/**
 * Simplified YouTube Viral Scoring Rubric v2.0
 *
 * Scoring: 1-10 scale per dimension, weighted total (0-100)
 * Designed for fast, accurate batch analysis by AI
 */

export const VIRAL_RUBRIC_PROMPT = (niche?: string) => {
  const nicheContext = niche
    ? `\n\nNICHE BENCHMARK: ${niche}\nCompare performance to typical ${niche} creators, not generic benchmarks.`
    : '';

  return `${nicheContext}

VIRAL SCORING RUBRIC - Score each dimension 1-10, then calculate weighted total:

**1. PRODUCTION QUALITY (20% weight)**
Quick checks (answer yes/no):
- Is video 1080p or higher resolution?
- Is audio clear without background noise?
- Is footage stable (not shaky)?
- Are there regular cuts/edits?
- Is lighting good enough to see subject?

Scoring: 5 yes = 10pts, 4 yes = 8pts, 3 yes = 6pts, 2 yes = 4pts, 1 yes = 2pts

**2. CONTENT VALUE (25% weight)**
Quick checks:
- Does it deliver on title/thumbnail promise?
- Would target audience find this valuable?
- Is there clear entertainment OR educational value?
- Would someone recommend this to friends?
- Is the payoff satisfying?

Scoring: Same as above (5 yes = 10pts down to 1 yes = 2pts)

**3. ENGAGEMENT (20% weight)**
Quick checks:
- Does first 5 seconds grab attention?
- Is intro under 10 seconds?
- Are there cuts/changes every 15-30 seconds?
- Is there a clear call-to-action?
- Does pacing feel tight (no dead time)?

Scoring: Same as above
THEN apply metric boosts:
- Like ratio >3% = +2pts, 2-3% = +1pt, <1% = -1pt
- Comment ratio >0.5% = +1pt, <0.1% = -1pt

**4. ALGORITHM OPTIMIZATION (15% weight)**
Thumbnail checks (0-5):
- High contrast colors?
- Text readable at small size (under 5 words)?
- Human face with clear emotion?
- Single clear focal point?
- Professional (not screenshot)?

Title checks (0-5):
- Contains primary keywords?
- 40-60 characters length?
- Creates curiosity or emotion?
- Accurate (not misleading)?
- Not all-caps or spammy?

Scoring: (Thumbnail checks + Title checks) / 10 = score

**5. UNIQUENESS (10% weight)**
Quick checks:
- Is concept or execution unique?
- Does it feel fresh vs tired?
- Would algorithm show to cold audience?
- Is there unique angle or personality?
- Does it add new value to niche?

Scoring: 5 yes = 10pts, 4 yes = 8pts, 3 yes = 6pts, 2 yes = 4pts, 1 yes = 2pts

**6. NICHE FIT (10% weight)**
Quick checks:
- Matches channel's typical content?
- Target audience will appreciate this?
- Creator seems knowledgeable?
- Authentic (not forced)?
- Aware of niche trends?

Scoring: 5 yes = 10pts, 4 yes = 8pts, 3 yes = 6pts, 2 yes = 4pts, 1 yes = 2pts

---

**CALCULATION:**
Final Score = (production × 0.20) + (content × 0.25) + (engagement × 0.20) + (algorithm × 0.15) + (uniqueness × 0.10) + (niche_fit × 0.10)

Then multiply by 10 to get 0-100 scale.

**RED FLAG PENALTIES (subtract from final score):**
- Misleading thumbnail/title: -10
- Poor audio (hard to understand): -5
- No hook in first 30 seconds: -5
- Shaky/unwatchable footage: -5
- No custom thumbnail: -3

**TIER ASSIGNMENT:**
- 95-100: Tier S (Viral Legend)
- 85-94: Tier A (Elite)
- 75-84: Tier B (Professional)
- 65-74: Tier C (Emerging)
- 50-64: Tier D (Developing)
- 0-49: Tier F (Needs Improvement)

When analyzing posts, provide dimension scores and show your calculation.`;
};

/**
 * Get tier info for a score
 */
export function getScoreTier(score: number): {
  tier: string;
  label: string;
  description: string;
} {
  if (score >= 95) return { tier: 'S', label: 'Viral Legend', description: 'Industry-defining content, peak performance' };
  if (score >= 85) return { tier: 'A', label: 'Elite', description: 'Consistently viral, strong brand' };
  if (score >= 75) return { tier: 'B', label: 'Professional', description: 'Solid performance, growing audience' };
  if (score >= 65) return { tier: 'C', label: 'Emerging', description: 'Building momentum, occasional viral hits' };
  if (score >= 50) return { tier: 'D', label: 'Developing', description: 'Learning phase, inconsistent results' };
  return { tier: 'F', label: 'Needs Improvement', description: 'Fundamental issues present' };
}
