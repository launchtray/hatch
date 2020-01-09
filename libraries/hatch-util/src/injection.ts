import 'reflect-metadata';
import {
  container as tsyringe_container,
  DependencyContainer as TSyringeDependencyContainer,
  injectable as tsyringe_injectable, InjectionToken,
  Lifecycle as tsyringe_Lifecycle,
  scoped as tsyringe_scoped,
} from 'tsyringe';
import {Dictionary} from 'tsyringe/dist/typings/types';

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

const getToken = (tokenUsedByDependency: TokenKey, dependency: any): TokenKey => {
  const dependencyName = dependency?.name;
  if (dependencySpecificTokens == null) {
    throw new Error('Injectable "' + dependencyName + '" cannot be imported before composition module');
  }
  const tokenMap = dependencySpecificTokens.get(dependencyName) ?? globalTokens;
  const resolvedToken = tokenMap.get(tokenUsedByDependency);
  return resolvedToken ?? tokenUsedByDependency;
};

// The following is a patch of tsyringe's inject decorator to support method parameters
const INJECTION_TOKEN_METADATA_KEY = 'injectionTokens';
const injectHelper = (token: InjectionToken<any>) => {
  return (
    target: any,
    propertyKey: string | symbol,
    parameterIndex: number
  ): any => {
    let injectionTokens: Dictionary<InjectionToken<any>>;
    injectionTokens = propertyKey
      ? Reflect.getOwnMetadata(INJECTION_TOKEN_METADATA_KEY, target, propertyKey) || {}
      : Reflect.getOwnMetadata(INJECTION_TOKEN_METADATA_KEY, target) || {};
    injectionTokens[parameterIndex] = token;
    Reflect.defineMetadata(
      INJECTION_TOKEN_METADATA_KEY,
      injectionTokens,
      target
    );
  };
};

// The following is a patch of tsyringe's internal getParamInfo to support method parameters
export const getParamInfo = (target: any, propertyKey: string | symbol | undefined = undefined): any[] => {
  let params: any[] = [];
  params = propertyKey
    ? Reflect.getMetadata('design:paramtypes', target, propertyKey) || []
    : Reflect.getMetadata('design:paramtypes', target) || [];

  let injectionTokens: Dictionary<InjectionToken<any>>;
  injectionTokens = propertyKey
    ? Reflect.getOwnMetadata(INJECTION_TOKEN_METADATA_KEY, target, propertyKey) || {}
    : Reflect.getOwnMetadata(INJECTION_TOKEN_METADATA_KEY, target) || {};

  Object.keys(injectionTokens).forEach((key) => {
    params[+key] = injectionTokens[key];
  });
  return params;
};

interface TokenDescriptor {
  token: InjectionToken<any>;
  multiple: boolean;
}

const isTokenDescriptor = (
  descriptor: any
): descriptor is TokenDescriptor => {
  return (
    typeof descriptor === 'object' &&
    'token' in descriptor &&
    'multiple' in descriptor
  );
};

export interface DependencyContainer extends TSyringeDependencyContainer {}

// This is adapted from tsyringe's autoInjectable
export const resolveArgs = (
  container: DependencyContainer,
  target: any,
  propertyKey: string | symbol | undefined = undefined,
  ...args: any[]
) => {
  const paramInfo = getParamInfo(target, propertyKey);
  const resolvedArgs = [
    ...args.concat(
      paramInfo.slice(args.length).map((type, index) => {
        try {
          if (isTokenDescriptor(type)) {
            return type.multiple
              ? container.resolveAll(type.token)
              : container.resolve(type.token);
          }
          return container.resolve(type);
        } catch (e) {
          const argIndex = index + args.length;
          let params;
          let targetName;
          if (propertyKey) {
            const methodName = String(propertyKey);
            [, params] = target.constructor.toString().match(new RegExp(`${methodName}\\(([\\w, ]+)\\)`)) || [];
            targetName = `${target.constructor.name}.${methodName}`;
          } else {
            [, params] = target.toString().match(/constructor\(([\w, ]+)\)/) || [];
            targetName = `${target.name} constructor`;
          }
          const argName = params
            ? params.split(',')[argIndex]
            : `#${argIndex}`;

          throw new Error(`Failed to inject parameter '${argName}' of ${targetName}.`);
        }
      })
    )
  ];
  return resolvedArgs;
};

export const inject = (token: TokenKey): (target: any, propertyKey: string | symbol, parameterIndex: number) => any => {
  return (target: any, propertyKey: string | symbol, parameterIndex: number) => {
    return injectHelper(getToken(token, target))(target, propertyKey, parameterIndex);
  };
};

export const initializeInjection = (context?: InjectionInitializationContext) => {
  const tokenRemaps = context?.tokenRemaps ?? [];
  globalTokens = new Map<string, string>();
  dependencySpecificTokens = new Map<any, Map<string, string>>();
  tsyringe_container.reset();
  for (const tokenRemap of tokenRemaps) {
    remapToken(tokenRemap);
  }
};

export const injectable = tsyringe_injectable;
export const ROOT_CONTAINER: DependencyContainer = tsyringe_container;
export const containerSingleton = <T>() => (target: Class<T>) => {
  return tsyringe_scoped(tsyringe_Lifecycle.ContainerScoped)(target);
};
