export type RequestQueueOptions = {
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
};

export function createSerializedRequestQueue(options: RequestQueueOptions = {}) {
  const sleep =
    options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const now = options.now ?? Date.now;
  let lastRequestAt: number | null = null;
  let queue: Promise<void> = Promise.resolve();

  function enqueue<T>(minIntervalMs: number, request: () => Promise<T>): Promise<T> {
    const result = queue.then(async () => {
      const currentTime = now();
      const elapsed = lastRequestAt === null ? minIntervalMs : currentTime - lastRequestAt;

      if (elapsed < minIntervalMs) {
        await sleep(minIntervalMs - elapsed);
      }

      lastRequestAt = now();
      return request();
    });

    queue = result.then(
      () => undefined,
      () => undefined
    );

    return result;
  }

  return { enqueue };
}
