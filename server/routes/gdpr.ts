import { Router } from 'express';
import { db } from '../db';
import { dataSubjectRequests } from '@shared/schema';
import { logger } from '../lib/logger';
import { eq } from 'drizzle-orm';

/**
 * GDPR Compliance Routes
 *
 * Provides endpoints for:
 * - Privacy policy disclosure
 * - Data Subject Access Requests (DSAR)
 * - Right to deletion
 * - Data portability
 */

const router = Router();

/**
 * GET /api/gdpr/privacy-policy
 * Returns privacy policy with GDPR disclosures
 */
router.get('/privacy-policy', async (req, res) => {
  try {
    const privacyPolicy = {
      lastUpdated: '2025-10-05',
      sections: [
        {
          title: 'Data We Collect',
          content: `We collect and process the following data:
- Account information (email, username)
- Social media profile URLs you provide
- Public content from your social media profiles (top 5 posts per platform)
- AI-generated analysis results and Viral Scores
- Usage analytics and performance metrics`
        },
        {
          title: 'Legal Basis for Processing',
          content: `We process your data under the following legal bases (GDPR Article 6):
- Consent: When you explicitly provide social media URLs for analysis
- Legitimate Interest (Article 6(1)(f)): Scraping publicly available social media data
- Contract Performance: Providing Creator Class subscription services`
        },
        {
          title: 'How We Use Your Data',
          content: `Your data is used to:
- Analyze your content and calculate Viral Scores
- Provide personalized recommendations
- Track your progress and performance metrics
- Improve our AI analysis algorithms`
        },
        {
          title: 'Data Retention',
          content: `We retain your data as follows:
- Profile analysis data: 30 days after analysis
- Account data: Until account deletion
- Scraped social media content: Deleted immediately after analysis
- Analytics data: Aggregated and anonymized after 90 days`
        },
        {
          title: 'Your Rights (GDPR)',
          content: `You have the right to:
- Access your personal data (Right of Access)
- Rectify inaccurate data (Right to Rectification)
- Delete your data (Right to Erasure/"Right to be Forgotten")
- Export your data (Right to Data Portability)
- Object to processing (Right to Object)
- Lodge a complaint with your supervisory authority`
        },
        {
          title: 'Third-Party Data Processing',
          content: `We scrape public data from:
- TikTok (via crew-social-tools)
- Instagram (via crew-social-tools)
- YouTube (via official API)

Precedent: hiQ Labs v. LinkedIn (9th Circuit) - scraping publicly accessible data is legal under CFAA.`
        },
        {
          title: 'Data Security',
          content: `We implement industry-standard security measures:
- Encrypted data transmission (HTTPS/TLS)
- Secure database storage (Neon PostgreSQL)
- Access controls and authentication
- Regular security audits`
        },
        {
          title: 'Contact & Data Requests',
          content: `To exercise your GDPR rights or contact our Data Protection Officer:
- Email: privacy@viralforge.ai
- Submit DSAR: /api/gdpr/dsar`
        }
      ]
    };

    res.json({
      success: true,
      privacyPolicy
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get privacy policy');
    res.status(500).json({ error: 'Failed to get privacy policy' });
  }
});

/**
 * POST /api/gdpr/dsar
 * Submit a Data Subject Access Request
 * Body: { email, requestType, details }
 */
router.post('/dsar', async (req, res) => {
  try {
    const { email, requestType, details } = req.body;

    // Validate input
    if (!email || !requestType) {
      return res.status(400).json({
        error: 'Email and request type are required'
      });
    }

    const validRequestTypes = [
      'access',        // Right to Access
      'rectification', // Right to Rectification
      'erasure',       // Right to Erasure ("Right to be Forgotten")
      'portability',   // Right to Data Portability
      'objection',     // Right to Object
      'complaint'      // Lodge a complaint
    ];

    if (!validRequestTypes.includes(requestType)) {
      return res.status(400).json({
        error: `Invalid request type. Must be one of: ${validRequestTypes.join(', ')}`
      });
    }

    // Create DSAR record
    const [dsar] = await db.insert(dataSubjectRequests).values({
      email,
      requestType,
      details: details || null,
      status: 'pending',
    }).returning();

    logger.info({
      dsarId: dsar.id,
      email,
      requestType
    }, 'DSAR submitted');

    res.json({
      success: true,
      requestId: dsar.id,
      message: `Your ${requestType} request has been received. We will respond within 30 days as required by GDPR.`,
      estimatedResponse: '30 days',
      contactEmail: 'privacy@viralforge.ai'
    });
  } catch (error) {
    logger.error({ error }, 'Failed to submit DSAR');
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

/**
 * GET /api/gdpr/dsar/:email
 * Check status of DSAR by email
 */
router.get('/dsar/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const requests = await db.query.dataSubjectRequests.findMany({
      where: eq(dataSubjectRequests.email, email),
      orderBy: (requests, { desc }) => [desc(requests.createdAt)],
    });

    if (requests.length === 0) {
      return res.status(404).json({
        error: 'No requests found for this email'
      });
    }

    // Redact sensitive details from response
    const publicRequests = requests.map(r => ({
      id: r.id,
      requestType: r.requestType,
      status: r.status,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt,
    }));

    res.json({
      success: true,
      requests: publicRequests
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get DSAR status');
    res.status(500).json({ error: 'Failed to get request status' });
  }
});

/**
 * DELETE /api/gdpr/delete-account
 * Handle Right to Erasure (account deletion)
 * Requires authentication
 */
router.delete('/delete-account', async (req, res) => {
  try {
    const { email, confirmationToken } = req.body;

    if (!email || !confirmationToken) {
      return res.status(400).json({
        error: 'Email and confirmation token are required'
      });
    }

    // Create DSAR for erasure request
    const [dsar] = await db.insert(dataSubjectRequests).values({
      email,
      requestType: 'erasure',
      details: `Account deletion requested with token: ${confirmationToken}`,
      status: 'pending',
    }).returning();

    logger.warn({
      dsarId: dsar.id,
      email
    }, 'Account deletion requested');

    res.json({
      success: true,
      requestId: dsar.id,
      message: 'Account deletion request submitted. Our team will process this within 30 days and contact you for verification.',
      note: 'This is a permanent action. All your data will be deleted.',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to process deletion request');
    res.status(500).json({ error: 'Failed to process deletion request' });
  }
});

/**
 * GET /api/gdpr/legitimate-interest-assessment
 * Returns Legitimate Interest Assessment (LIA) for scraping
 */
router.get('/legitimate-interest-assessment', async (req, res) => {
  try {
    const lia = {
      title: 'Legitimate Interest Assessment (LIA)',
      legalBasis: 'GDPR Article 6(1)(f) - Legitimate Interests',
      dateAssessed: '2025-10-05',
      purpose: 'Scraping publicly available social media content for creator analysis',

      legitimateInterest: {
        description: 'Helping content creators improve their viral potential through data-driven insights',
        benefits: [
          'Creators gain valuable feedback on their content strategy',
          'Personalized recommendations based on actual performance',
          'Industry benchmarking and growth insights',
          'Free educational value for creators'
        ]
      },

      necessity: {
        description: 'Scraping public content is necessary because:',
        reasons: [
          'Official APIs have limited access or high costs (Instagram Graph API requires Business accounts)',
          'Manual analysis is impractical at scale',
          'Public data provides the most accurate representation of actual performance',
          'Alternative approaches (user-uploaded screenshots) are less accurate'
        ]
      },

      balancingTest: {
        userInterests: 'Privacy concerns about public data being analyzed',
        ourInterests: 'Providing valuable creator insights',
        conclusion: 'Our legitimate interest outweighs potential privacy impact because:',
        reasoning: [
          'Data is already publicly accessible',
          'We only analyze top 5 posts (minimal data collection)',
          'Analysis is opt-in (users must provide URLs)',
          'Data is deleted after 30 days',
          'Users can object or request deletion at any time',
          'Legal precedent: hiQ Labs v. LinkedIn supports scraping public data'
        ]
      },

      safeguards: [
        'Data minimization: Only top 5 posts per platform',
        '30-day retention policy',
        'Opt-in analysis (requires explicit user action)',
        'Right to object and deletion',
        'Transparent privacy policy',
        'DSAR portal for all GDPR rights'
      ],

      legalPrecedent: {
        case: 'hiQ Labs, Inc. v. LinkedIn Corp.',
        court: 'U.S. Court of Appeals for the Ninth Circuit',
        ruling: 'Scraping publicly accessible data does not violate CFAA',
        relevance: 'Establishes legal framework for scraping public social media data'
      }
    };

    res.json({
      success: true,
      lia
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get LIA');
    res.status(500).json({ error: 'Failed to get assessment' });
  }
});

export default router;
