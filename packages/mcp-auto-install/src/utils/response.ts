import type { OperationResult } from '../types';

/**
 * Utility function to create error response
 */
export function createErrorResponse(message: string): OperationResult {
  return {
    success: false,
    message: [message],
  };
}

/**
 * Utility function to create success response
 */
export function createSuccessResponse(message: string | string[], data?: unknown): OperationResult {
  return {
    success: true,
    message: Array.isArray(message) ? message : [message],
    ...(data !== undefined && { data }),
  };
}

/**
 * Utility function to create content items for MCP server response
 */
export function createContentItems(result: OperationResult): Array<{ type: string; text: string }> {
  const items = result.message.map(text => ({ type: 'text', text }));

  if (result.data) {
    items.push({
      type: 'text',
      text: typeof result.data === 'string' ? result.data : JSON.stringify(result.data),
    });
  }

  return items;
}

/**
 * Utility function to create MCP server response
 */
export function createServerResponse(result: OperationResult, jsonOnly: boolean) {
  const response: {
    content: Array<{ type: string; text: string }>;
    data?: unknown;
    success: boolean;
  } = {
    content: createContentItems(result),
    success: result.success,
  };

  if (jsonOnly && result.data) {
    response.data = result.data;
  }

  return response;
}
