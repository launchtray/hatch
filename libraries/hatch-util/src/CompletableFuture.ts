export class FutureTimeoutError<T> extends Error {
  name: string;
  stack: any;

  private future: CompletableFuture<T>;

  constructor(future: CompletableFuture<T>, stack: any) {
    let message = 'timed out waiting for future';
    if (future.name != null) {
      message += ': ' + future.name;
    }
    super(message);
    this.name = 'FutureTimeoutError';
    this.stack = stack || (new Error(message)).stack;
    this.future = future;
  }
}

export default class CompletableFuture<T> {
  private resolve?: (value?: T) => void;
  private reject?: (reason: Error) => void;
  private promise: Promise<T>;

  // Name is used to provide a more descriptive error upon timeout
  constructor(public name?: string) {
    this.promise = this.reset();
  }

  // Must be called after a timeout before .get() is called again, otherwise .get() will time out immediately
  reset() {
    const self = this;
    this.promise = new Promise((resolve, reject) => {
      self.resolve = resolve;
      self.reject = reject;
    });
    return this.promise;
  }

  // Call to complete future, so that .get() call returns a value
  complete(value?: T) {
    this.resolve?.(value);
  }

  // Call to complete future exceptionally, so that .get() call throws an exception
  completeExceptionally(err: Error) {
    this.reject?.(err);
  }

  // Call to get future value set by .complete()
  async get(timeoutMilliseconds?: number): Promise<T> {
    if (timeoutMilliseconds == null) {
      return this.promise;
    } else {
      const callerStack = (new Error()).stack;
      const timer = setTimeout((self: CompletableFuture<T>) => {
        self.reject?.(new FutureTimeoutError(self, callerStack));
      }, timeoutMilliseconds, this);
      const result = await this.promise;
      clearTimeout(timer);
      return result;
    }
  }
}
