import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Environment variables for auth
const JWT_SECRET = process.env.JWT_SECRET || 'your-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const NEON_AUTH_URL = process.env.NEON_AUTH_URL || '';

export interface AuthUser {
  id: string;
  username: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// Rate limiting for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register rate limiting
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registration attempts per hour
  message: {
    error: 'Too many registration attempts, please try again later',
  },
});

// JWT token verification middleware
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Optional auth middleware (doesn't fail if no token)
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Continue without auth for optional endpoints
    next();
  }
};

// Generate JWT token
export const generateToken = (user: { id: string; username: string }): string => {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );
};

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

// Verify password
export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Extract user ID from request (with fallback for demo compatibility)
export const getUserId = (req: AuthRequest): string => {
  if (req.user?.id) {
    return req.user.id;
  }
  
  // Fallback for development - remove in production
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Using demo-user fallback - implement proper auth');
    return 'demo-user';
  }
  
  throw new Error('User not authenticated');
};

// Auth integration helpers (now using PostgreSQL storage)
export const neonAuthHelpers = {
  // Register user
  async registerUser(username: string, password: string): Promise<{ user: AuthUser; token: string }> {
    try {
      const { storage } = await import('./storage');
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        throw new Error('User already exists');
      }
      
      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const newUser = await storage.createUser({
        username,
        password: hashedPassword,
      });
      
      const authUser: AuthUser = {
        id: newUser.id,
        username: newUser.username,
      };
      
      const token = generateToken(authUser);
      
      return { user: authUser, token };
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof Error && error.message.includes('already exists')) {
        throw error;
      }
      throw new Error('Registration failed');
    }
  },

  // Login user
  async loginUser(username: string, password: string): Promise<{ user: AuthUser; token: string }> {
    try {
      const { storage } = await import('./storage');
      
      // Find user by username
      const user = await storage.getUserByUsername(username);
      if (!user) {
        throw new Error('Invalid credentials');
      }
      
      // Verify password
      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }
      
      const authUser: AuthUser = {
        id: user.id,
        username: user.username,
      };
      
      const token = generateToken(authUser);
      
      return { user: authUser, token };
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Invalid credentials');
    }
  },

  // Refresh token
  async refreshToken(token: string): Promise<string> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      return generateToken({ id: decoded.id, username: decoded.username });
    } catch (error) {
      throw new Error('Token refresh failed');
    }
  },

  // Validate token
  async validateToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      return decoded;
    } catch (error) {
      return null;
    }
  }
};

// Environment validation
export const validateAuthEnvironment = (): void => {
  const requiredEnvVars = ['JWT_SECRET'];
  
  if (process.env.NODE_ENV === 'production') {
    requiredEnvVars.push('NEON_AUTH_URL');
  }
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'your-dev-secret-change-in-production') {
    throw new Error('JWT_SECRET must be changed in production');
  }
};

export default {
  authenticateToken,
  optionalAuth,
  authLimiter,
  registerLimiter,
  generateToken,
  hashPassword,
  verifyPassword,
  isValidEmail,
  isValidPassword,
  getUserId,
  neonAuthHelpers,
  validateAuthEnvironment,
};