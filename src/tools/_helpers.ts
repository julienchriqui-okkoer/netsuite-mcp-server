/**
 * Common helpers for MCP tool responses
 */

/**
 * Create a successful MCP tool response
 */
export function successResponse(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Create an error MCP tool response
 */
export function errorResponse(message: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: message,
      },
    ],
    isError: true,
  };
}

/**
 * Validate required parameters
 * @returns Error response if validation fails, null if valid
 */
export function validateRequired(
  params: Record<string, any>,
  required: string[]
): ReturnType<typeof errorResponse> | null {
  const missing = required.filter((key) => !params[key]);
  
  if (missing.length > 0) {
    return errorResponse(
      `Missing required parameter(s): ${missing.join(", ")}`
    );
  }
  
  return null;
}

/**
 * Wrap a tool handler with consistent error handling
 */
export function wrapToolHandler<T extends Record<string, any>>(
  handler: (args: T) => Promise<ReturnType<typeof successResponse>>
) {
  return async (args: T) => {
    try {
      return await handler(args);
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return errorResponse(`Error: ${message}`);
    }
  };
}
