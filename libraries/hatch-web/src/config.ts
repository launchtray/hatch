const _runtimeConfig: any = {};
export const runtimeConfig: any = typeof window !== 'undefined' ? (window as any).__RUNTIME_CONFIG__ : _runtimeConfig;
