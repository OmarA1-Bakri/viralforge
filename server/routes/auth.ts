import { Router, Response } from 'express';
import { 
  authLimiter, 
  registerLimiter, 
  neonAuthHelpers, 
  isValidEmail, 
  isValidPassword,
  authenticateToken,
  AuthRequest
} from '../auth';

const router = Router();

// Apply rate limiting to all auth routes
router.use(authLimiter);

// Register endpoint
router.post('/register', registerLimiter, async (req, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    if (username.length < 3) {
      return res.status(400).json({ 
        error: 'Username must be at least 3 characters long' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    console.log(`📝 Registration attempt for: ${username}`);

    // Register user
    const { user, token } = await neonAuthHelpers.registerUser(username, password);

    console.log(`✅ User registered successfully: ${user.id}`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user.id,
        username: user.username
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({ 
          error: 'An account with this username already exists' 
        });
      }
    }

    res.status(500).json({ 
      error: 'Registration failed. Please try again.' 
    });
  }
});

// Login endpoint
router.post('/login', async (req, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    console.log(`🔑 Login attempt for: ${username}`);

    // Authenticate user
    const { user, token } = await neonAuthHelpers.loginUser(username, password);

    console.log(`✅ User logged in successfully: ${user.id}`);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);

    res.status(401).json({ 
      error: 'Invalid username or password' 
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        error: 'Refresh token is required' 
      });
    }

    const newToken = await neonAuthHelpers.refreshToken(token);

    res.json({
      success: true,
      token: newToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    
    res.status(401).json({ 
      error: 'Token refresh failed' 
    });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    res.json({
      success: true,
      user: {
        id: req.user.id,
        username: req.user.username
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Logout endpoint (client-side token removal)
router.post('/logout', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    console.log(`👋 User logged out: ${req.user?.id}`);
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Validate token endpoint (for client-side token validation)
router.post('/validate', async (req, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        error: 'Token is required' 
      });
    }

    const user = await neonAuthHelpers.validateToken(token);

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token' 
      });
    }

    res.json({
      success: true,
      valid: true,
      user: {
        id: user.id,
        username: user.username
      }
    });

  } catch (error) {
    console.error('Token validation error:', error);
    
    res.status(401).json({ 
      error: 'Token validation failed',
      valid: false 
    });
  }
});

export default router;