export async function withRetry<T>(
  fn: () => Promise<T>,
  context = "NetSuite call"
): Promise<T> {
  const delays = [0, 3000, 10000]; // immediate, 3s, 10s
  let lastError: any;

  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) {
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const status = error?.response?.status ?? error?.status;
      const message = error?.message ?? "";
      const isRetryableStatus = status === 429 || status === 503 || status === 504;
      const isRetryableMessage =
        message.includes("CONCURRENCY_LIMIT_EXCEEDED") ||
        message.includes("Too Many Requests") ||
        message.includes("ECONNRESET") ||
        message.includes("ETIMEDOUT");

      if (!isRetryableStatus && !isRetryableMessage) {
        throw error;
      }
      // Retryable — continue loop
    }
  }
  throw new Error(
    `${context} failed after ${delays.length} attempts: ${lastError?.message ?? "Unknown error"}`
  );
}

