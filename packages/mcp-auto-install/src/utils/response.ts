import type { OperationResult } from '../types.js';

/**
 * Create an error result.
 */
export function createErrorResponse(message: string): OperationResult {
  return {
    success: false,
    message: [message],
  };
}

/**
 * Create a success result.
 */
export function createSuccessResponse(message: string | string[], data?: unknown): OperationResult {
  return {
    success: true,
    message: Array.isArray(message) ? message : [message],
    ...(data !== undefined && { data }),
  };
}

/**
 * Convert an OperationResult into MCP tool response format.
 */
export function toToolResponse(result: OperationResult) {
  const content = result.message.map(text => ({ type: 'text' as const, text }));

  if (result.data) {
    content.push({
      type: 'text' as const,
      text: typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2),
    });
  }

  return { content, isError: !result.success };
}
