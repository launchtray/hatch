import {Breadcrumb, Options} from '@sentry/types';

export interface SentryMonitor {
  addBreadcrumb(breadcrumb: Breadcrumb): void;
  captureException(error: Error): void;
  init(options: Options): void;
  setExtra(key: string, extra: unknown): void;
  setTag(key: string, value: string): void;
}
