/**
 * Structured Webhook Logger
 * Provides consistent logging format across webhook handlers
 */

export interface WebhookLogContext {
  source: 'stripe' | 'revenuecat';
  eventType: string;
  eventId?: string;
  userId?: string;
  [key: string]: string | number | boolean | undefined;
}

class WebhookLogger {
  private formatMessage(level: string, message: string, context?: WebhookLogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [WEBHOOK] [${level}] ${message}${contextStr}`;
  }

  info(message: string, context?: WebhookLogContext): void {
    console.log(this.formatMessage('INFO', message, context));
  }

  warn(message: string, context?: WebhookLogContext): void {
    console.warn(this.formatMessage('WARN', message, context));
  }

  error(message: string, error?: Error | unknown, context?: WebhookLogContext): void {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const fullContext = context ? { ...context, error: errorMsg } : { error: errorMsg };
    console.error(this.formatMessage('ERROR', message, fullContext));
  }

  success(message: string, context?: WebhookLogContext): void {
    console.log(this.formatMessage('SUCCESS', message, context));
  }

  security(message: string, context?: WebhookLogContext): void {
    console.error(this.formatMessage('SECURITY', message, context));
  }
}

export const webhookLogger = new WebhookLogger();
