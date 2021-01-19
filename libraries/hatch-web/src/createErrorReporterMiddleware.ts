import {ErrorReporter} from '@launchtray/hatch-util';
import {AnyAction, Dispatch, Middleware, MiddlewareAPI} from 'redux';

export const createErrorReporterMiddleware = (
  reporter: ErrorReporter,
): Middleware => (store: MiddlewareAPI) => (next: Dispatch) => (action: AnyAction) => {
  reporter.captureAction(action, store.getState());
  return next(action);
};
