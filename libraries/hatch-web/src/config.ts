import {AnyJsonObject} from '@launchtray/hatch-util';

const privateRuntimeConfig: AnyJsonObject = {};
export const runtimeConfig: AnyJsonObject = typeof window !== 'undefined'
  // eslint-disable-next-line no-undef, @typescript-eslint/naming-convention, no-underscore-dangle -- global window
  ? (window as unknown as {__RUNTIME_CONFIG__: AnyJsonObject}).__RUNTIME_CONFIG__
  : privateRuntimeConfig;
