export const withTimeout = async <T> (durationMs: number, promise: Promise<T>): Promise<T> => {
  let timer = null;
  const timeout = new Promise<T>((resolve, reject) => {
    const rejectCallback = () => {
      timer = null;
      reject(new Error('Task timed out'));
    };
    timer = setTimeout(rejectCallback, durationMs);
  });
  const result = await Promise.race([promise, timeout]);
  if (timer != null) {
    clearTimeout(timer);
  }
  return result;
};

export const retry = async <T> (totalAttempts: number, task: () => Promise<T>): Promise<T> => {
  let attemptsRemaining = totalAttempts;
  let caughtError = null;
  while (attemptsRemaining > 0) {
    try {
      return await task();
    } catch (err) {
      caughtError = err;
      attemptsRemaining -= 1;
    }
  }
  throw caughtError;
};
