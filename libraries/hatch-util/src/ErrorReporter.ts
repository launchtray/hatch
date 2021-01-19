export interface Action<T> {
  payload?: T;
  type?: string;
}

export interface ErrorReporter {
  captureAction(action: Action<unknown>, prevState: unknown): void;
  captureException(exception: Error): void;
  captureLog(message: string): void;
}
