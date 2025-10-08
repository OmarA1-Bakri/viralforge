import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Sanitize sensitive data from logs to prevent API key exposure
 * CRITICAL: Prevents API keys from being logged in error objects
 */
const sanitizeForLog = (obj: any, visited = new WeakSet()): any => {
  if (typeof obj !== 'object' || obj === null) return obj;

  // Handle circular references - prevent infinite recursion
  if (visited.has(obj)) {
    return '[Circular Reference]';
  }
  visited.add(obj);

  // Handle URLSearchParams and other special browser/Node objects
  if (obj instanceof URLSearchParams || obj.constructor?.name === 'URLSearchParams') {
    return obj.toString();
  }

  // Handle Headers and other fetch API objects
  if (obj.constructor?.name === 'Headers' || typeof obj.entries === 'function') {
    try {
      return Object.fromEntries(obj.entries());
    } catch {
      return '[Complex Object]';
    }
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForLog(item, visited));
  }

  const sanitized: any = {};
  const sensitiveKeys = [
    'authorization', 'auth', 'api_key', 'apikey', 'api-key',
    'token', 'password', 'secret', 'key', 'bearer',
    'x-api-key', 'x-auth-token', 'cookie', 'session'
  ];

  for (const key in obj) {
    const lowerKey = key.toLowerCase();

    // Redact sensitive keys
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
    // Recursively sanitize nested objects
    else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitized[key] = sanitizeForLog(obj[key], visited);
    }
    // Redact values that look like API keys (long alphanumeric strings)
    else if (typeof obj[key] === 'string' && /^[A-Za-z0-9_-]{30,}$/.test(obj[key])) {
      sanitized[key] = `[REDACTED_${obj[key].substring(0, 4)}...]`;
    }
    else {
      sanitized[key] = obj[key];
    }
  }

  return sanitized;
};

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'HH:MM:ss',
    },
  } : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  base: {
    env: process.env.NODE_ENV,
  },
  // Add serializer to sanitize all log data
  serializers: {
    err: pino.stdSerializers.err,
    error: (error: any) => sanitizeForLog(error),
    req: (req: any) => sanitizeForLog(pino.stdSerializers.req(req)),
    res: pino.stdSerializers.res,
  },
  // Hook to sanitize all logged objects
  hooks: {
    logMethod(inputArgs: any[], method: any) {
      // Sanitize all arguments before logging
      const sanitizedArgs = inputArgs.map((arg: any) =>
        typeof arg === 'object' ? sanitizeForLog(arg) : arg
      );
      return method.apply(this, sanitizedArgs as any);
    },
  },
});

// Helper functions for common logging patterns
export const logRequest = (method: string, path: string, statusCode: number, duration: number, requestId?: string) => {
  logger.info({
    type: 'request',
    method,
    path,
    statusCode,
    duration,
    requestId,
  }, `${method} ${path} ${statusCode} - ${duration}ms`);
};

export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error({
    type: 'error',
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    ...context,
  }, error.message);
};

export const logAICall = (service: string, model: string, tokens: number, cost: number, duration: number) => {
  logger.info({
    type: 'ai_call',
    service,
    model,
    tokens,
    cost,
    duration,
  }, `AI call: ${service}/${model} - ${tokens} tokens - $${cost.toFixed(4)} - ${duration}ms`);
};
