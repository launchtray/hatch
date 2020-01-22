const configSource = typeof window !== 'undefined'
  ? (window as any).__ENV__
  : process.env;

export const runtimeConfig = {
  SENTRY_DSN: configSource.SENTRY_DSN,
};