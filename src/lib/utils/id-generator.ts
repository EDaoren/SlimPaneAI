/**
 * Secure ID generation utilities
 */

/**
 * Generate a unique ID using crypto.randomUUID if available,
 * fallback to timestamp + random for older browsers
 */
export function generateId(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers
  return generateFallbackId();
}

/**
 * Generate ID with timestamp and random components
 */
function generateFallbackId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  const extra = Math.random().toString(36).substring(2, 15);
  
  return `${timestamp}-${random}-${extra}`;
}

/**
 * Generate a short ID (8 characters)
 */
export function generateShortId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Generate a session ID with timestamp prefix
 */
export function generateSessionId(): string {
  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const id = generateShortId();
  return `session-${timestamp}-${id}`;
}

/**
 * Generate a message ID with timestamp
 */
export function generateMessageId(): string {
  const timestamp = Date.now();
  const random = generateShortId();
  return `msg-${timestamp}-${random}`;
}
