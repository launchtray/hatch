export interface Action<T = any> {
  payload?: any;
  type: T;
}

export interface ErrorReporter {
  captureAction(action: Action, prevState: any): void;
  captureException(exception: Error): void;
  captureLog(message: string): void;
}