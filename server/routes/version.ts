import { Router } from 'express';
import { execSync } from 'child_process';

const router = Router();

router.get('/version', (req, res) => {
  try {
    const gitHash = execSync('git rev-parse --short HEAD').toString().trim();
    const gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    const buildTime = new Date().toISOString();

    res.json({
      server: {
        gitHash,
        gitBranch,
        buildTime,
        nodeEnv: process.env.NODE_ENV,
        version: '1.0.0',
      },
      status: 'healthy'
    });
  } catch (error) {
    res.json({
      server: {
        gitHash: 'unknown',
        gitBranch: 'unknown',
        buildTime: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV,
        version: '1.0.0',
      },
      status: 'degraded',
      error: 'Git info unavailable'
    });
  }
});

export default router;
