/**
 * Standardized error handling for the application
 * Single source of truth for error types and result handling
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'API_ERROR'
  | 'DATABASE_ERROR'
  | 'AUTH_ERROR'
  | 'NOT_FOUND'
  | 'RATE_LIMIT'
  | 'PARSE_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'

/**
 * Standard result type for all operations
 * Use this for server actions, service functions, and async operations
 */
export type Result<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; code?: ErrorCode }

/**
 * Create a success result
 */
export function ok<T>(data?: T, message?: string): Result<T> {
  return { success: true, data, message }
}

/**
 * Create an error result
 */
export function err(message: string, code?: ErrorCode): Result<never> {
  return { success: false, error: message, code }
}

/**
 * Type guard to check if result is success
 */
export function isOk<T>(result: Result<T>): result is { success: true; data?: T; message?: string } {
  return result.success
}

/**
 * Type guard to check if result is error
 */
export function isErr<T>(result: Result<T>): result is { success: false; error: string; code?: ErrorCode } {
  return !result.success
}

/**
 * Get user-friendly error message based on error code
 */
export function getUserMessage(code?: ErrorCode): string {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 'Invalid data provided. Please check your input.'
    case 'API_ERROR':
      return 'External service error. Please try again.'
    case 'DATABASE_ERROR':
      return 'Database error. Please try again.'
    case 'AUTH_ERROR':
      return 'Session expired. Please refresh the page.'
    case 'NOT_FOUND':
      return 'The requested resource was not found.'
    case 'RATE_LIMIT':
      return 'Too many requests. Please wait a moment.'
    case 'PARSE_ERROR':
      return 'Failed to process response. Please try again.'
    case 'NETWORK_ERROR':
      return 'Network error. Please check your connection.'
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

/**
 * Log error with context (server-side only)
 */
export function logError(
  context: string,
  message: string,
  details?: { code?: ErrorCode; cause?: unknown; meta?: unknown }
): void {
  console.error(`[${context}] ${details?.code || 'ERROR'}: ${message}`, {
    ...details,
    cause: details?.cause instanceof Error ? details.cause.message : details?.cause
  })
}

/**
 * Wrap async operation with consistent error handling
 */
export async function withErrorHandling<T>(
  context: string,
  operation: () => Promise<T>
): Promise<Result<T>> {
  try {
    const data = await operation()
    return ok(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logError(context, message, { code: 'UNKNOWN_ERROR', cause: error })
    return err(message, 'UNKNOWN_ERROR')
  }
}
