/* eslint-disable @typescript-eslint/no-explicit-any, no-param-reassign --
 * This code is very dynamic by nature, so I'm making some lint exceptions for now to make things easier while APIs are
 * still in flux.
 */
import {
  Class,
  DependencyContainer,
  ErrorReporter,
  injectable,
  Logger,
  resolveParams,
  ROOT_CONTAINER,
} from '@launchtray/hatch-util';
import express, {Application, NextFunction, Request, RequestHandler, Response, Router} from 'express';
import WebSocket from 'ws';
import * as HttpStatus from 'http-status-codes';
import {
  ASSOCIATED_API_SPEC_KEY,
  APIMetadataConsumer,
  APIMetadataParameters,
  Server,
  ServerMiddlewareClass,
} from './ServerMiddleware';
import {OpenAPIMethod, OpenAPIParameter, OpenAPIRequestBody, OpenAPIResponses} from './OpenAPI';
import {alternateActionResponseSent, apiErrorResponseSent} from './api-utils';

export type PathParams = string | RegExp | Array<string | RegExp>;

export interface RouteDefiner {
  (
    app: Application,
    server: Server,
    handler: RequestHandler,
    controller: any
  ): void;
}

export interface APIMetadataRegistrar {
  (apiMetadataConsumer: APIMetadataConsumer): void;
}

export interface APIMetadataRegistrarWithAnnotationData {
  (
    apiMetadataConsumer: APIMetadataConsumer,
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): void;
}

export type Route = {method?: HTTPMethod, path: PathParams} | PathParams;

export enum LivenessState {
  CORRECT = 'CORRECT',
  BROKEN = 'BROKEN',
}

export enum ReadinessState {
  ACCEPTING_TRAFFIC = 'ACCEPTING_TRAFFIC',
  REFUSING_TRAFFIC = 'REFUSING_TRAFFIC',
}

export enum HealthStatus {
  UP = 'UP',
  DOWN = 'DOWN',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
  UNKNOWN = 'UNKNOWN',
}

// Use this to customize the route used for app info. Explicitly set to null to disable route.
export const CUSTOM_INFO_ROUTE = Symbol('CUSTOM_INFO_ROUTE');
// Use this to customize the route used for liveness checks. Explicitly set to null to disable route.
export const CUSTOM_LIVENESS_ROUTE = Symbol('CUSTOM_LIVENESS_ROUTE');
// Use this to customize the route used for readiness checks. Explicitly set to null to disable route.
export const CUSTOM_READINESS_ROUTE = Symbol('CUSTOM_READINESS_ROUTE');
// Use this to customize the route used for overall health check. Explicitly set to null to disable route.
export const CUSTOM_OVERALL_HEALTH_ROUTE = Symbol('CUSTOM_OVERALL_HEALTH_ROUTE');

const isRouteObject = (route: Route): route is {method?: HTTPMethod, path: PathParams} => {
  return route != null && (route as {path?: string}).path != null;
};

// eslint-disable-next-line @typescript-eslint/no-empty-function -- intenional no-op for route matching
const noop = () => {};

export const requestMatchesRouteList = (req: {url: string, method: string}, routeList: Route[]) => {
  let matches = false;
  if (routeList != null && routeList.length > 0) {
    const matchesSetter = () => {
      matches = true;
    };
    const router = Router();
    routeList.forEach((item) => {
      if (isRouteObject(item)) {
        if (item.method != null) {
          router[item.method](item.path, matchesSetter);
        } else {
          router.all(item.path, matchesSetter);
        }
      } else {
        router.all(item, matchesSetter);
      }
    });
    router({url: req.url, method: req.method} as any, {} as any, noop);
  }
  return matches;
};

const routeDefinersKey = Symbol('routeDefiners');
const registerMetadataKey = Symbol('registerMetadata');
const rootContainerKey = Symbol('rootContainer');
const wsRoutesKey = Symbol('wsEnabled');
const requestContainerKey = Symbol('requestContainer');
const livenessChecksKey = Symbol('livenessChecksKey');
const readinessChecksKey = Symbol('readinessChecksKey');
const appInfoKey = Symbol('appInfoKey');
const injectContainerOnlyKey = Symbol('injectContainerOnlyKey');

// Keep consistent with version in createClient.tsx, or consolidate to common library
const registerPerRequestAuthDependencies = (
  container: DependencyContainer,
  {cookie, authHeader}: {cookie?: string, authHeader?: string},
) => {
  container.registerInstance('cookie', cookie ?? '');
  container.registerInstance('authHeader', authHeader ?? '');
};

export const registerPerRequestDependencies = (
  container: DependencyContainer,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  container.registerInstance('Request', req);
  container.registerInstance('Response', res);
  container.registerInstance('NextFunction', next);

  // Use WeakRef to avoid creating a strong circular reference to itself
  container.registerInstance('weakContainer', new WeakRef(container));

  registerPerRequestAuthDependencies(container, {
    cookie: req.headers.cookie,
    authHeader: req.headers.authorization,
  });
};

export const reportError = async (container: DependencyContainer, label: string, err: unknown) => {
  const errorReporter = await container.resolve<ErrorReporter>('ErrorReporter');
  const logger = await container.resolve<Logger>('Logger');
  logger.error(`${label}:`, err);
  errorReporter.captureException(err as Error);
};

const custom = (routeDefiner: RouteDefiner, registerMetadata?: APIMetadataRegistrarWithAnnotationData) => {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const requestHandler = async (ctlr: any, req: Request, res: Response, next: NextFunction) => {
      let container = req[requestContainerKey];
      if (container == null) {
        const rootContainer = ctlr[rootContainerKey] as DependencyContainer;
        container = rootContainer.createChildContainer();
        req[requestContainerKey] = container;
        registerPerRequestDependencies(container, req, res, next);
      }
      try {
        const args = [];
        if ((target[injectContainerOnlyKey] as boolean | undefined) ?? false) {
          args.push(container);
        } else {
          args.push(...(await resolveParams(container, target, propertyKey)));
        }
        const methodResponse = await originalMethod.apply(ctlr, args);
        if (alternateActionResponseSent(methodResponse, res)) {
          return;
        }
      } catch (err: unknown) {
        if (!apiErrorResponseSent(err, res)) {
          await reportError(container, `Error servicing route '${String(propertyKey)}'`, err);
          res.sendStatus(500);
        }
      }
    };

    if (target[routeDefinersKey] == null) {
      target[routeDefinersKey] = [];
    }
    if (target[registerMetadataKey] == null) {
      target[registerMetadataKey] = [];
    }
    const ctlrRouteDefiner = (
      ctlr: any,
      app: Application,
      server: Server,
    ) => {
      routeDefiner(app, server, (req: Request<any>, res: Response, next: NextFunction) => {
        requestHandler(ctlr, req, res, next).catch(next);
      }, ctlr);
    };
    target[routeDefinersKey].push(ctlrRouteDefiner);
    if (registerMetadata != null) {
      const metadataRegistrar: APIMetadataRegistrar = (apiMetadataConsumer) => {
        if (target.constructor[ASSOCIATED_API_SPEC_KEY] == null) {
          registerMetadata(apiMetadataConsumer, target, propertyKey, descriptor);
        }
      };
      target[registerMetadataKey].push(metadataRegistrar);
    }
  };
};

const registerRouteTokens = (ctlr: any, metadata: APIMetadataParameters, route: Route) => {
  const rootContainer = ctlr[rootContainerKey] as DependencyContainer;
  if (metadata.tokens != null && metadata.tokens.length > 0) {
    metadata.tokens.forEach((token) => {
      rootContainer.register(token, {useValue: route});
    });
  }
};

const getResponseId = (response: string, totalResponseCount: number) => {
  if (totalResponseCount === 1) {
    return '';
  }
  if (Number.isNaN(Number(response))) {
    return response;
  }
  return HttpStatus.getStatusText(Number(response));
};

const addTitleToRequestBody = (
  apiMetadata: {operationId: string | undefined, requestBody: OpenAPIRequestBody | undefined},
) => {
  if (apiMetadata.requestBody != null) {
    const mediaType = 'application/json';
    const {operationId} = apiMetadata;
    const schema = apiMetadata.requestBody?.content?.[mediaType]?.schema;
    if (operationId != null && schema != null && schema.title == null) {
      apiMetadata.requestBody.content[mediaType].schema.title = `${operationId}Payload`;
    }
  }
};

const addTitleToResponses = (apiMetadata: {operationId: string | undefined, responses: Partial<OpenAPIResponses>}) => {
  if (apiMetadata.responses != null) {
    const mediaType = 'application/json';
    const {operationId} = apiMetadata;
    const responses = Object.keys(apiMetadata.responses);
    responses.forEach((response) => {
      const schema = response != null && apiMetadata.responses?.[response]?.content?.[mediaType]?.schema;
      if (operationId != null && schema != null && schema.title == null) {
        const id = getResponseId(response, responses.length);
        apiMetadata.responses[response].content[mediaType].schema.title = `${operationId + id}Response`;
      }
    });
  }
};

const createAPIMetadataWithDefaults = (
  target: any,
  propertyKey: string | symbol,
  metadata: APIMetadataParameters,
  apiMethod: OpenAPIMethod,
  apiPath: string,
  parameters: OpenAPIParameter[],
) => {
  const controllerName = target.constructor.name.replace(/Controller$/, '');
  const defaultTags = [controllerName];
  const defaultOperationId = String(propertyKey);
  return {
    description: metadata.description ?? '',
    method: apiMethod,
    path: apiPath,
    requestBody: metadata.requestBody ?? defaultRequestBody(apiMethod, metadata),
    parameters,
    responses: metadata.responses ?? {
      default: {
        description: '',
        content: {
          'application/json': {
            schema: {
              type: 'object',
            },
          },
        },
      },
    },
    operationId: metadata.operationId ?? defaultOperationId,
    tags: (metadata.tags != null && metadata.tags.length > 0) ? metadata.tags : defaultTags,
    security: metadata.security,
  };
};

const consumeAPIMetadata = (
  target: any,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
  metadata: APIMetadataParameters,
  method: keyof RouteDefiners,
  path: PathParams,
  apiMetadataConsumer: APIMetadataConsumer,
) => {
  const apiMethod = convertExpressMethodToOpenAPIMethod(method);
  const parameters: OpenAPIParameter[] = [];
  const apiPath = convertExpressPathToOpenAPIPath(path, metadata.parameters ?? {}, parameters);
  if (apiMethod != null && apiPath != null) {
    const apiMetadata = createAPIMetadataWithDefaults(target, propertyKey, metadata, apiMethod, apiPath, parameters);
    if (apiMetadata.operationId != null) {
      addTitleToRequestBody(apiMetadata);
      addTitleToResponses(apiMetadata);
    }
    apiMetadataConsumer(apiMetadata);
  }
};

const websocket = (path: PathParams, metadata: APIMetadataParameters = {}) => {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const requestHandler = async (ctlr: any, webSocket: WebSocket, req: Request, webSocketServer: WebSocket.Server) => {
      const rootContainer = ctlr[rootContainerKey] as DependencyContainer;
      const socketContainer = rootContainer.createChildContainer();
      socketContainer.registerInstance('Request', req);
      socketContainer.registerInstance('WebSocket', webSocket);
      socketContainer.registerInstance('WebSocketServer', webSocketServer);
      socketContainer.registerInstance('cookie', req.headers.cookie ?? '');
      socketContainer.registerInstance('authHeader', req.headers.authorization ?? '');
      const args = await resolveParams(socketContainer, target, propertyKey);
      originalMethod.apply(ctlr, args);
    };

    if (target[routeDefinersKey] == null) {
      target[routeDefinersKey] = [];
    }
    if (target[registerMetadataKey] == null) {
      target[registerMetadataKey] = [];
    }
    const routeDefiner = (ctlr: any, app: Application, server: Server) => {
      registerRouteTokens(ctlr, metadata, {path, method: 'get'});
      if (server[wsRoutesKey] == null) {
        server[wsRoutesKey] = [];
        server.on('upgrade', (req, socket, head) => {
          let foundRoute = false;
          server[wsRoutesKey].forEach((route: any) => {
            const matchingReq = route.matches(req);
            if (matchingReq != null) {
              foundRoute = true;
              route.wss.handleUpgrade(req, socket, head, (webSocket: WebSocket) => {
                route.wss.emit('connection', webSocket, matchingReq);
              });
            }
          });
          if (!foundRoute) {
            socket.destroy();
          }
        });
      }
      const wss = new WebSocket.Server({noServer: true});
      wss.on('connection', (webSocket: WebSocket, req: Request) => {
        requestHandler(ctlr, webSocket, req, wss)
          .catch(() => {
            webSocket.terminate();
          });
      });
      server[wsRoutesKey].push({
        matches: (req: Request) => {
          const router = express.Router();
          let matchingRequest = null;
          router.get(path, (routerReq: Request) => {
            matchingRequest = routerReq;
          });
          router(req, {} as any, noop);
          return matchingRequest;
        },
        wss,
      });
    };
    const registerMetadata = (apiMetadataConsumer: APIMetadataConsumer) => {
      consumeAPIMetadata(target, propertyKey, descriptor, metadata, 'get', path, apiMetadataConsumer);
    };
    target[routeDefinersKey].push(routeDefiner);
    target[registerMetadataKey].push(registerMetadata);
  };
};

export const cleanUpRouting = (app: Application, server: Server) => {
  if (server[wsRoutesKey] != null) {
    server[wsRoutesKey].forEach((route: any) => {
      route.wss.close();
    });
  }
  server[wsRoutesKey] = null;
  server.removeAllListeners('upgrade');
};

export const assignRootContainerToController = (ctlr: any, container: DependencyContainer) => {
  ctlr[rootContainerKey] = container;
};

export const hasControllerRoutes = (maybeController: any) => {
  return maybeController.prototype[routeDefinersKey] != null;
};

type BoundRouteDefiner = (
    controller: any,
    app: Application,
    server: Server,
    apiMetadataConsumer: APIMetadataConsumer
) => void;

export interface Delegator<D> {
  delegate?: D;
}

const originalGetLivenessStateKey = Symbol('originalGetLivenessState');
const originalGetReadinessStateKey = Symbol('originalGetReadinessState');
const originalGetAppInfoKey = Symbol('originalGetAppInfo');

const saveOriginalHealthCheckMethods = <D>(target?: DelegatingControllerClass<D> | Class<D>) => {
  if (target != null) {
    if (target[originalGetLivenessStateKey] === undefined) {
      target[originalGetLivenessStateKey] = target.prototype.getLivenessState ?? null;
    }
    if (target[originalGetReadinessStateKey] === undefined) {
      target[originalGetReadinessStateKey] = target.prototype.getReadinessState ?? null;
    }
    if (target[originalGetAppInfoKey] === undefined) {
      target[originalGetAppInfoKey] = target.prototype.getAppInfo ?? null;
    }
  }
};

const registerLivenessChecks = (
  container: DependencyContainer,
  target: any,
  delegateType: any,
) => {
  const livenessChecks = target.prototype[livenessChecksKey] ?? [];
  target.prototype[livenessChecksKey] = [];
  const delegateLivenessChecks = delegateType?.prototype[livenessChecksKey] ?? [];
  if (delegateType != null) {
    delegateType.prototype[livenessChecksKey] = [];
  }
  if (livenessChecks != null && livenessChecks.length > 0) {
    // eslint-disable-next-line complexity
    target.prototype.getLivenessState = async function getLivenessStateWrapper() {
      let overallState: LivenessState | undefined;
      if (target[originalGetLivenessStateKey] != null) {
        const state = await target[originalGetLivenessStateKey].bind(this)();
        if (state != null && state !== true && state !== LivenessState.CORRECT) {
          overallState = state;
        }
      }
      for (const livenessCheck of livenessChecks) {
        const state = await livenessCheck(this);
        if (state != null && state !== true && state !== LivenessState.CORRECT) {
          overallState = state;
        }
      }
      if (delegateType != null) {
        if (delegateType[originalGetLivenessStateKey] != null) {
          const state = await delegateType[originalGetLivenessStateKey].bind(this.delegate)();
          if (state != null && state !== true && state !== LivenessState.CORRECT) {
            overallState = state;
          }
        }
        for (const livenessCheck of delegateLivenessChecks) {
          const state = await livenessCheck(this.delegate);
          if (state != null && state !== true && state !== LivenessState.CORRECT) {
            overallState = state;
          }
        }
      }
      return overallState ?? LivenessState.CORRECT;
    };
  }
};

const registerReadinessChecks = (
  container: DependencyContainer,
  target: any,
  delegateType: any,
) => {
  const readinessChecks = target.prototype[readinessChecksKey] ?? [];
  target.prototype[readinessChecksKey] = [];
  const delegateReadinessChecks = delegateType?.prototype[readinessChecksKey] ?? [];
  if (delegateType != null) {
    delegateType.prototype[readinessChecksKey] = [];
  }
  if (readinessChecks != null && readinessChecks.length > 0) {
    // eslint-disable-next-line complexity
    target.prototype.getReadinessState = async function getReadinessStateWrapper() {
      let overallState: ReadinessState | undefined;
      if (target[originalGetReadinessStateKey] != null) {
        const state = await target[originalGetReadinessStateKey].bind(this)();
        if (state != null && state !== true && state !== ReadinessState.ACCEPTING_TRAFFIC) {
          overallState = state;
        }
      }
      for (const readinessCheck of readinessChecks) {
        const state = await readinessCheck(this);
        if (state != null && state !== true && state !== ReadinessState.ACCEPTING_TRAFFIC) {
          overallState = state;
        }
      }
      if (delegateType != null) {
        if (delegateType[originalGetReadinessStateKey] != null) {
          const state = await delegateType[originalGetReadinessStateKey].bind(this.delegate)();
          if (state != null && state !== true && state !== ReadinessState.ACCEPTING_TRAFFIC) {
            overallState = state;
          }
        }
        for (const readinessCheck of delegateReadinessChecks) {
          const state = await readinessCheck(this.delegate);
          if (state != null && state !== true && state !== ReadinessState.ACCEPTING_TRAFFIC) {
            overallState = state;
          }
        }
      }
      return overallState ?? ReadinessState.ACCEPTING_TRAFFIC;
    };
  }
};

const registerAppInfoProviders = (
  container: DependencyContainer,
  target: any,
  delegateType: any,
) => {
  const appInfoProviders = target.prototype[appInfoKey] ?? [];
  target.prototype[appInfoKey] = [];
  const delegateAppInfoProviders = delegateType?.prototype[appInfoKey] ?? [];
  if (delegateType != null) {
    delegateType.prototype[appInfoKey] = [];
  }
  if (
    (appInfoProviders != null && appInfoProviders.length > 0)
    || (delegateAppInfoProviders != null && delegateAppInfoProviders.length > 0)
  ) {
    target.prototype.getAppInfo = async function getAppInfoWrapper() {
      let overallInfo: {[key: string]: any} = {};
      if (target[originalGetAppInfoKey] != null) {
        try {
          const info = await target[originalGetAppInfoKey].bind(this)();
          overallInfo = {
            ...overallInfo,
            ...info,
          };
        } catch (err) {
          await reportError(container, 'Error gathering app info', err);
        }
      }
      for (const appInfoProvider of appInfoProviders) {
        try {
          const info = await appInfoProvider(this);
          overallInfo = {
            ...overallInfo,
            ...info,
          };
        } catch (err) {
          await reportError(container, 'Error gathering app info', err);
        }
      }
      if (delegateType != null) {
        if (delegateType[originalGetAppInfoKey] != null) {
          try {
            const info = await delegateType[originalGetAppInfoKey].bind(this.delegate)();
            overallInfo = {
              ...overallInfo,
              ...info,
            };
          } catch (err) {
            await reportError(container, 'Error gathering app info', err);
          }
        }
        for (const appInfoProvider of delegateAppInfoProviders) {
          try {
            const info = await appInfoProvider(this.delegate);
            overallInfo = {
              ...overallInfo,
              ...info,
            };
          } catch (err) {
            await reportError(container, 'Error gathering app info', err);
          }
        }
      }
      return overallInfo;
    };
  }
};

const registerAllHealthChecks = (
  container: DependencyContainer,
  target: any,
  delegateType: any,
) => {
  saveOriginalHealthCheckMethods(target);
  saveOriginalHealthCheckMethods(delegateType);
  registerLivenessChecks(container, target, delegateType);
  registerReadinessChecks(container, target, delegateType);
  registerAppInfoProviders(container, target, delegateType);
};

export type DelegatingControllerClass<D> = Class<Delegator<D>> & {delegateToken?: string | symbol};

export function middlewareFor<T extends Class<any>>(target: T): ServerMiddlewareClass;
// eslint-disable-next-line no-redeclare
export function middlewareFor<D>(target: DelegatingControllerClass<D>, delegateType: Class<D>): ServerMiddlewareClass;
// eslint-disable-next-line no-redeclare
export function middlewareFor<D>(
  target: DelegatingControllerClass<D>,
  delegateType?: Class<D>,
): ServerMiddlewareClass {
  if (!hasControllerRoutes(target)) {
    throw new Error(`Cannot register ${target.name} as middleware, as it has no @routes defined.`);
  }
  const {delegateToken} = target as DelegatingControllerClass<D>;
  if (delegateToken != null) {
    if (delegateType == null) {
      throw new Error(`Missing delegate parameter for call to middlewareFor for ${target.name}`);
    }
    ROOT_CONTAINER.registerSingleton(delegateType);
    ROOT_CONTAINER.register(delegateToken, {
      useFactory: (container) => container.resolve(delegateType),
    });
  }

  const originalRegister = target.prototype.register;
  const delegateOriginalRegister = delegateType?.prototype.register;
  target.prototype.register = async function registerWrapper(
    app: Application,
    server: Server,
    apiMetadataConsumer: APIMetadataConsumer,
  ) {
    if (delegateType != null && this.delegate != null && this.delegate[rootContainerKey] == null) {
      this.delegate[rootContainerKey] = this[rootContainerKey];
      if (delegateOriginalRegister != null) {
        await delegateOriginalRegister.bind(this.delegate)(app, server, apiMetadataConsumer);
      }
      delegateType?.prototype[routeDefinersKey]?.forEach((boundRouteDefiner: BoundRouteDefiner) => {
        boundRouteDefiner(this.delegate, app, server, apiMetadataConsumer);
      });
    }
    if (originalRegister != null) {
      await originalRegister.bind(this)(app, server, apiMetadataConsumer);
    }
    target.prototype[routeDefinersKey].forEach((boundRouteDefiner: BoundRouteDefiner) => {
      boundRouteDefiner(this, app, server, apiMetadataConsumer);
    });
  };

  registerAllHealthChecks(ROOT_CONTAINER, target, delegateType);

  const originalRegisterMetadata = target.constructor.prototype.registerAPIMetadata;
  const delegateOriginalRegisterMetadata = delegateType?.prototype.registerAPIMetadata;
  target.constructor.prototype.registerAPIMetadata = async function registerAPIMetadataWrapper(
    apiMetadataConsumer: APIMetadataConsumer,
  ) {
    if (this.delegate != null && this.delegate[rootContainerKey] == null) {
      if (delegateOriginalRegisterMetadata != null) {
        await delegateOriginalRegisterMetadata.bind(this)(apiMetadataConsumer);
      }
      this.delegate.prototype[registerMetadataKey]?.forEach((apiMetadataRegistrar: APIMetadataRegistrar) => {
        apiMetadataRegistrar(apiMetadataConsumer);
      });
    }
    if (originalRegisterMetadata != null) {
      await originalRegisterMetadata.bind(this)(apiMetadataConsumer);
    }
    target.prototype[registerMetadataKey].forEach((apiMetadataRegistrar: APIMetadataRegistrar) => {
      apiMetadataRegistrar(apiMetadataConsumer);
    });
  };
  return target as unknown as ServerMiddlewareClass;
}

export type HTTPMethod =
  | 'all'
  | 'checkout'
  | 'copy'
  | 'delete'
  | 'get'
  | 'head'
  | 'lock'
  | 'merge'
  | 'mkactivity'
  | 'mkcol'
  | 'move'
  | 'notify'
  | 'options'
  | 'patch'
  | 'post'
  | 'purge'
  | 'put'
  | 'report'
  | 'search'
  | 'subscribe'
  | 'trace'
  | 'unlock'
  | 'unsubscribe';

export type StandardRouteDefiners = {
  [method in HTTPMethod]:
    (path: PathParams, metadata?: APIMetadataParameters) => any;
};

export interface NonStandardRouteDefiners {
  custom: (routeDefiner: RouteDefiner, registerMetadata?: APIMetadataRegistrar) => any;
  // eslint-disable-next-line @typescript-eslint/naming-convention -- intentionally using name similar to HTTP method
  m_search: (path: PathParams, metadata?: APIMetadataParameters) => any;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  _delete: (path: PathParams, metadata?: APIMetadataParameters) => any;
  websocket: (path: PathParams, metadata?: APIMetadataParameters) => any;
}

export type RouteDefiners = StandardRouteDefiners & NonStandardRouteDefiners;

export interface ControllerProps {
  injectContainerOnly?: boolean;
}

type ClassDecorator<T> = (target: Class<T>) => void;

export const controller = <T>(controllerProps?: ControllerProps): ClassDecorator<T> => {
  return (target) => {
    target.prototype[injectContainerOnlyKey] = controllerProps?.injectContainerOnly ?? false;
    return injectable()(target);
  };
};

export const convertExpressPathToOpenAPIPath = (
  path: PathParams,
  paramsIn: {
    [key: string]: Partial<OpenAPIParameter>,
  },
  paramsOut: OpenAPIParameter[],
): string | undefined => {
  const nonPathParams = {...paramsIn};
  let newPath: string | undefined;
  if (typeof path === 'string') {
    newPath = path.replace(/:([A-Za-z0-9_]*)/g, (_, param) => {
      delete nonPathParams[param];
      paramsOut.push({
        ...paramsIn[param],
        name: param,
        in: 'path',
        required: true,
        schema: {
          type: 'string',
          ...paramsIn[param]?.schema,
        },
      });
      return `{${param}}`;
    });
  }
  Object.keys(nonPathParams).forEach((param) => {
    paramsOut.push({
      name: param,
      in: 'query',
      required: false,
      ...paramsIn[param],
      schema: {
        type: 'string',
        ...paramsIn[param]?.schema,
      },
    });
  });
  return newPath;
};

export const convertExpressMethodToOpenAPIMethod = (method: keyof RouteDefiners): OpenAPIMethod | undefined => {
  if (['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'].includes(method)) {
    return method as OpenAPIMethod;
  }
  return undefined;
};

const defaultRequestBody = (method: OpenAPIMethod, metadata: APIMetadataParameters): OpenAPIRequestBody | undefined => {
  if (['put', 'post', 'patch'].includes(method)) {
    return {
      ...metadata.requestBody,
      description: metadata.requestBody?.description ?? '',
      content: metadata.requestBody?.content ?? {
        'application/json': {
          schema: {},
          example: {},
        },
      },
    };
  }
  return undefined;
};

const proxy = {
  get(proxyTarget: RouteDefiners, method: keyof RouteDefiners) {
    let adjustedMethod: string = method;
    if (method === 'custom') {
      return custom;
    }
    if (method === 'websocket') {
      return websocket;
    }
    if (method === 'm_search') {
      adjustedMethod = 'm-search';
    }
    if (method === '_delete') {
      adjustedMethod = 'delete';
    }
    return (path: PathParams, metadata: APIMetadataParameters = {}) => {
      const routeDefiner: RouteDefiner = (app, server, handler, ctlr: any) => {
        const definer = app[adjustedMethod].bind(app) as (path: PathParams, handler: any) => void;
        definer(path, handler);
        registerRouteTokens(ctlr, metadata, {path, method: adjustedMethod as HTTPMethod});
      };
      const registerMetadata: APIMetadataRegistrarWithAnnotationData = (
        apiMetadataConsumer,
        target,
        propertyKey,
        descriptor,
      ) => {
        consumeAPIMetadata(target, propertyKey, descriptor, metadata, method, path, apiMetadataConsumer);
      };
      return custom(routeDefiner, registerMetadata);
    };
  },
};

export default new Proxy({custom} as any, proxy) as RouteDefiners;

const addHealthCheck = (
  checkKey: symbol,
  target: any,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
) => {
  const originalMethod = descriptor.value;
  if (target[checkKey] == null) {
    target[checkKey] = [];
  }
  target[checkKey].push(async (ctlr: any) => {
    const rootContainer = ctlr[rootContainerKey] as DependencyContainer;
    const args = await resolveParams(rootContainer, target, propertyKey);
    return await originalMethod.apply(ctlr, args);
  });
};

export const livenessCheck = () => {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    addHealthCheck(livenessChecksKey, target, propertyKey, descriptor);
  };
};

export const readinessCheck = () => {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    addHealthCheck(readinessChecksKey, target, propertyKey, descriptor);
  };
};

export const appInfoProvider = () => {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    addHealthCheck(appInfoKey, target, propertyKey, descriptor);
  };
};
