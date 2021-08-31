import {Breadcrumb, Options, Severity} from '@sentry/types';
import {Action, ErrorReporter} from './ErrorReporter';
import {SentryMonitor} from './SentryMonitor';
import {Logger} from './Logger';

export default class SentryReporter implements ErrorReporter {
  private readonly initialized?: boolean;
  private initializedWarningShown = false;

  constructor(private readonly sentry: SentryMonitor, private readonly logger: Logger, options: Options) {
    if (options?.dsn != null) {
      this.sentry.init({dsn: options.dsn, integrations: options.integrations});
      this.initialized = true;
    } else {
      this.initialized = false;
    }
    this.logger.info('Error reporting initialized:', this.initialized);
  }

  public captureAction(action: Action<unknown>, prevState: unknown) {
    if (this.initialized) {
      try {
        this.sentry.setExtra('stateBeforeLastAction', prevState);
        const breadcrumb: Breadcrumb = {
          level: Severity.Info,
          category: 'action',
          message: action.type,
        };
        if (action.payload != null) {
          breadcrumb.data = {payload: action.payload};
        }
        this.sentry.addBreadcrumb(breadcrumb);
      } catch (error) {
        this.logger.error('Error reporting action:', (error as Error).message);
      }
    } else if (this.initialized == null && !this.initializedWarningShown) {
      this.initializedWarningShown = true;
      this.logger.error('Error reporting actions: Sentry not initialized');
    }
  }

  public captureException(exception: Error) {
    if (this.initialized) {
      try {
        if (exception?.stack != null) {
          this.sentry.setExtra('exceptionContext', exception.stack);
        }
        this.sentry.captureException(exception);
      } catch (error) {
        this.logger.error(`Error reporting exception: ${(error as Error).message}`);
      }
    }
  }

  public captureLog(message: string) {
    if (this.initialized) {
      try {
        const breadcrumb: Breadcrumb = {
          level: Severity.Info,
          category: 'log',
          message,
        };
        this.sentry.addBreadcrumb(breadcrumb);
      } catch (err) {
        // Ignore, to prevent infinite recursion
      }
    }
  }
}
