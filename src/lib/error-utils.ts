/**
 * Error handling utilities for consistent error message display across the application.
 * Provides centralized logic for detecting and formatting different types of errors.
 */

/**
 * Check if an error message indicates a permission/RLS (Row Level Security) violation.
 * 
 * @param errorMessage - The error message to check
 * @returns true if the error appears to be a permission/RLS error
 */
export function isPermissionError(errorMessage: string): boolean {
  const message = errorMessage.toLowerCase()
  
  return (
    message.includes("permission") || 
    message.includes("unauthorized") || 
    message.includes("access denied") ||
    message.includes("insufficient privilege") ||
    message.includes("row level security") ||
    message.includes("rls") ||
    message.includes("policy") ||
    message.includes("forbidden")
  )
}

/**
 * Check if an error message indicates a validation error (invalid UUID, foreign key constraint, etc.).
 * 
 * @param errorMessage - The error message to check
 * @returns true if the error appears to be a validation error
 */
export function isValidationError(errorMessage: string): boolean {
  const message = errorMessage.toLowerCase()
  
  return (
    message.includes("invalid input syntax for type uuid") ||
    message.includes("foreign key constraint") ||
    message.includes("duplicate key")
  )
}

/**
 * Get a user-friendly error message for database operations.
 * 
 * @param error - The error object or message
 * @param operation - The operation being performed (e.g., "create event", "delete item")
 * @returns A user-friendly error message
 */
export function getDatabaseErrorMessage(error: unknown, operation: string): string {
  if (!(error instanceof Error)) {
    return `Failed to ${operation}. Please try again.`
  }

  const message = error.message.toLowerCase()
  
  if (isValidationError(error.message)) {
    if (message.includes("invalid input syntax for type uuid")) {
      return "One or more selected items have invalid IDs. Please refresh and try again."
    } else if (message.includes("foreign key constraint")) {
      return "Selected item or player no longer exists. Please refresh and try again."
    } else if (message.includes("duplicate key")) {
      return "This operation would create a duplicate. Please check your data and try again."
    }
  }
  
  if (isPermissionError(error.message)) {
    return `You don't have permission to ${operation}. Please contact an administrator if you believe this is an error.`
  }
  
  return `Error: ${error.message}`
}

/**
 * Get a user-friendly error message specifically for permission errors.
 * 
 * @param operation - The operation being performed (e.g., "perform this action", "delete this item")
 * @returns A user-friendly permission error message
 */
export function getPermissionErrorMessage(operation: string): string {
  return `You don't have permission to ${operation}. Please contact an administrator if you believe this is an error.`
}
