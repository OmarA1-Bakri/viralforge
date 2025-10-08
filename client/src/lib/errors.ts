/**
 * Extract user-friendly error message from various error formats
 * Never show raw error objects or technical details to users
 */
export function getErrorMessage(error: unknown): string {
  // Handle null/undefined
  if (!error) return 'An unexpected error occurred';

  // If it's already a clean string
  if (typeof error === 'string') return error;

  // Handle Error objects
  if (error instanceof Error) {
    return error.message || 'An unexpected error occurred';
  }

  // Handle API error responses { error: "message" }
  if (typeof error === 'object' && 'error' in error) {
    const err = error as { error?: string };
    if (typeof err.error === 'string') return err.error;
  }

  // Handle { message: "text" }
  if (typeof error === 'object' && 'message' in error) {
    const err = error as { message?: string };
    if (typeof err.message === 'string') return err.message;
  }

  // Fallback for anything else
  return 'An unexpected error occurred';
}
