import 'reflect-metadata';
import {
  container as tsyringe_container,
  DependencyContainer,
  initializer as tsyringe_initializer,
  inject as tsyringe_inject,
  injectAll as tsyringe_injectAll,
  injectable as tsyringe_injectable,
  Lifecycle,
  resolveParams as tsyringe_resolveParams,
  scoped as tsyringe_scoped,
} from '@launchtray/tsyringe-async';
import {NonLogger} from './NonLogger';

export type TokenKey = string | symbol;

let globalTokens: Map<TokenKey, TokenKey>;
let dependencySpecificTokens: Map<string, Map<TokenKey, TokenKey>>;

export interface TokenMapping {
  tokenRegisteredByProject: TokenKey;
  tokenUsedByDependency: TokenKey;
  dependencyName?: string;
}

export interface InjectionInitializationContext {
  tokenRemaps?: TokenMapping[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- rest args are not known for this generic type
export type Class<T> = new (...args: any[]) => T;

const remapToken = ({tokenRegisteredByProject, tokenUsedByDependency, dependencyName}: TokenMapping) => {
  let tokenMap: Map<TokenKey, TokenKey>;
  if (dependencyName != null) {
    tokenMap = dependencySpecificTokens.get(dependencyName) ?? new Map<TokenKey, TokenKey>();
    dependencySpecificTokens.set(dependencyName, tokenMap);
  } else {
    tokenMap = globalTokens;
  }
  tokenMap.set(tokenUsedByDependency, tokenRegisteredByProject);
};

const getToken = (tokenUsedByDependency: TokenKey, dependency: unknown, propertyKey?: string | symbol): TokenKey => {
  let dependencyName = (dependency as {name: string})?.name;
  if (propertyKey != null) {
    dependencyName = `${(dependency as {constructor: {name: string}})?.constructor?.name}.${String(propertyKey)}`;
  }
  if (dependencySpecificTokens == null) {
    if (process?.env?.JEST_WORKER_ID != null || process.env.NODE_ENV === 'test') {
      // eslint-disable-next-line no-console -- intentional warning to console
      console.info('Using default dependency injection initialization for testing');
      initializeInjection();
      ROOT_CONTAINER.registerInstance('Logger', new NonLogger());
    } else {
      throw new Error(`Injectable "${dependencyName}" cannot be imported before composition module`);
    }
  }
  const tokenMap = dependencySpecificTokens.get(dependencyName) ?? globalTokens;
  const resolvedToken = tokenMap.get(tokenUsedByDependency);
  return resolvedToken ?? tokenUsedByDependency;
};

export const inject = (token: TokenKey) => {
  return (target: unknown, propertyKey: string | symbol, paramIndex: number) => {
    return tsyringe_inject(getToken(token, target, propertyKey))(target, propertyKey, paramIndex);
  };
};

export const injectAll = (token: TokenKey) => {
  return (target: unknown, propertyKey: string | symbol, paramIndex: number) => {
    return tsyringe_injectAll(getToken(token, target, propertyKey))(target, propertyKey, paramIndex);
  };
};

export const initializeInjection = (context?: InjectionInitializationContext) => {
  const tokenRemaps = context?.tokenRemaps ?? [];
  globalTokens = new Map<string, string>();
  dependencySpecificTokens = new Map<string, Map<TokenKey, TokenKey>>();
  tsyringe_container.reset();
  for (const tokenRemap of tokenRemaps) {
    remapToken(tokenRemap);
  }
};

export const injectable: <T>() => (target: Class<T>) => void = tsyringe_injectable;
export const ROOT_CONTAINER: DependencyContainer = tsyringe_container;
export const containerSingleton = <T>() => (target: Class<T>) => {
  return tsyringe_scoped(Lifecycle.ContainerScoped)(target);
};

/* eslint-disable @typescript-eslint/no-explicit-any -- intentionally dynamic code */
export const resolveParams: (
  container: DependencyContainer,
  target: unknown,
  propertyKey: string | symbol | undefined,
  ...args: any[]
) => Promise<any[]> = tsyringe_resolveParams;
export const initializer: () => (
  target: unknown,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor
) => any = tsyringe_initializer;
