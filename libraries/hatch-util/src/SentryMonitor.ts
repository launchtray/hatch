import * as Sentry from '@sentry/types';

export interface SentryMonitor {
  addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void;
  captureException(error: any): void;
  init(options: any): void;
  setExtra(key: string, extra: any): void;
  setTag(key: string, value: string): void;
}