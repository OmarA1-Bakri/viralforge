import { UserPreferences } from '../../shared/schema';

/**
 * Validation constants and functions for user preferences
 * Provides defense-in-depth input validation beyond database constraints
 */

export const VALID_NICHES = [
  'fitness',
  'tech',
  'gaming',
  'lifestyle',
  'business',
  'entertainment',
  'education',
  'food',
  'travel',
  'fashion',
  'beauty',
  'health',
  'finance',
  'sports',
  'music',
  'art',
  'comedy',
  'news',
  'politics',
  'science'
] as const;

export const VALID_AUDIENCES = [
  'gen-z',
  'millennials',
  'gen-x',
  'boomers',
  'gen-alpha',
  'all-ages'
] as const;

export const VALID_CONTENT_STYLES = [
  'educational',
  'entertaining',
  'inspirational',
  'promotional',
  'informative',
  'storytelling',
  'how-to',
  'review',
  'vlog',
  'tutorial'
] as const;

export const VALID_CATEGORIES = [
  'technology',
  'gaming',
  'lifestyle',
  'entertainment',
  'education',
  'sports',
  'music',
  'food',
  'travel',
  'fashion',
  'beauty',
  'fitness',
  'health',
  'finance',
  'business',
  'news',
  'politics',
  'science',
  'art',
  'comedy'
] as const;

/**
 * Validates user preferences to prevent injection attacks and data integrity issues
 * @throws Error if validation fails
 */
export function validateUserPreferences(prefs: Partial<UserPreferences>): void {
  // Validate niche
  if (prefs.niche !== undefined && prefs.niche !== null) {
    if (typeof prefs.niche !== 'string') {
      throw new Error('Niche must be a string');
    }
    if (prefs.niche.length > 50) {
      throw new Error('Niche too long (max 50 characters)');
    }
    // Note: Not enforcing enum validation to allow custom niches
    // but limiting length and type for safety
  }

  // Validate target audience
  if (prefs.targetAudience !== undefined && prefs.targetAudience !== null) {
    if (typeof prefs.targetAudience !== 'string') {
      throw new Error('Target audience must be a string');
    }
    if (prefs.targetAudience.length > 50) {
      throw new Error('Target audience too long (max 50 characters)');
    }
  }

  // Validate content style
  if (prefs.contentStyle !== undefined && prefs.contentStyle !== null) {
    if (typeof prefs.contentStyle !== 'string') {
      throw new Error('Content style must be a string');
    }
    if (prefs.contentStyle.length > 50) {
      throw new Error('Content style too long (max 50 characters)');
    }
  }

  // Validate preferred categories
  if (prefs.preferredCategories !== undefined && prefs.preferredCategories !== null) {
    if (!Array.isArray(prefs.preferredCategories)) {
      throw new Error('Preferred categories must be an array');
    }
    if (prefs.preferredCategories.length > 20) {
      throw new Error('Too many preferred categories (max 20)');
    }
    for (const cat of prefs.preferredCategories) {
      if (typeof cat !== 'string') {
        throw new Error('Each category must be a string');
      }
      if (cat.length > 50) {
        throw new Error('Category name too long (max 50 characters)');
      }
    }
  }

  // Validate other string fields
  const stringFields = [
    'niche',
    'targetAudience',
    'contentStyle',
    'platformFocus',
    'contentGoals'
  ] as const;

  for (const field of stringFields) {
    const value = prefs[field];
    if (value !== undefined && value !== null) {
      if (typeof value !== 'string') {
        throw new Error(`${field} must be a string`);
      }
      if (value.length > 200) {
        throw new Error(`${field} too long (max 200 characters)`);
      }
      // Check for potential injection patterns
      if (/[<>;"'`${}]/.test(value)) {
        throw new Error(`${field} contains invalid characters`);
      }
    }
  }
}

/**
 * Sanitizes user input by removing potentially dangerous characters
 */
export function sanitizeString(input: string, maxLength: number = 200): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>;"'`${}]/g, '');
}
