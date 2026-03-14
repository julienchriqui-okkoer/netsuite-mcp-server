export async function batchParallel<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number = 10,
  delayBetweenBatchesMs: number = 300
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    if (i + concurrency < items.length && delayBetweenBatchesMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatchesMs));
    }
  }
  return results;
}

