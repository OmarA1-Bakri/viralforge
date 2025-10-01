import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

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
