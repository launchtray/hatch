/* eslint-disable @typescript-eslint/no-explicit-any, no-param-reassign --
 * This code is very dynamic by nature, so I'm making some lint exceptions for now to make things easier while APIs are
 * still in flux. This may get cleaned up with a future "API-first" redesign. Do as I say, not as I do.
 */
import {
  Class,
  DependencyContainer,
  injectable,
  resolveParams,
  ROOT_CONTAINER,
} from '@launchtray/hatch-util';
import express, {Application, NextFunction, Request, RequestHandler, Response, Router} from 'express';
import WebSocket from 'ws';
import * as HttpStatus from 'http-status-codes';
import {
  APIMetadataConsumer,
  APIMetadataParameters,
  Server,
  ServerMiddlewareClass,
} from './ServerMiddleware';
import {OpenAPIMethod, OpenAPIParameter, OpenAPIRequestBody, OpenAPIResponses} from './OpenAPI';

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

const custom = (routeDefiner: RouteDefiner, registerMetadata?: APIMetadataRegistrarWithAnnotationData) => {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const requestHandler = async (ctlr: any, req: Request, res: Response, next: NextFunction) => {
      let container = req[requestContainerKey];
      if (container == null) {
        const rootContainer = ctlr[rootContainerKey] as DependencyContainer;
        container = rootContainer.createChildContainer();
        req[requestContainerKey] = container;
      }
      container.registerInstance('Request', req);
      container.registerInstance('Response', res);
      container.registerInstance('NextFunction', next);
      container.registerInstance('cookie', req.headers.cookie ?? '');
      container.registerInstance('authHeader', req.headers.authorization ?? '');
      const args = [];
      if (target[injectContainerOnlyKey] as boolean) {
        args.push(container);
      } else {
        args.push(await resolveParams(container, target, propertyKey));
      }
      await originalMethod.apply(ctlr, args);
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
        registerMetadata(apiMetadataConsumer, target, propertyKey, descriptor);
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

type ControllerBoundRouteDefiner = (
    controller: any,
    app: Application,
    server: Server,
    apiMetadataConsumer: APIMetadataConsumer
) => void;

export interface Delegator<D> {
  delegate?: D;
}

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
    ROOT_CONTAINER.registerSingleton(delegateToken, delegateType);
  }

  const originalRegister = target.prototype.register;
  target.prototype.register = async function registerWrapper(
    app: Application,
    server: Server,
    apiMetadataConsumer: APIMetadataConsumer,
  ) {
    if (originalRegister != null) {
      await originalRegister.bind(this)(app, server, apiMetadataConsumer);
    }
    target.prototype[routeDefinersKey].forEach((controllerBoundRouteDefiner: ControllerBoundRouteDefiner) => {
      controllerBoundRouteDefiner(this, app, server, apiMetadataConsumer);
    });
  };

  if (target.prototype[livenessChecksKey] != null && target.prototype[livenessChecksKey].length > 0) {
    const originalGetLivenessState = target.prototype.getLivenessState;
    target.prototype.getLivenessState = async function getLivenessStateWrapper() {
      let overallState: LivenessState | undefined;
      if (originalGetLivenessState != null) {
        const state = await originalGetLivenessState.bind(this)();
        if (state != null && state !== true && state !== LivenessState.CORRECT) {
          overallState = state;
        }
      }
      for (const livenessCheck of target.prototype[livenessChecksKey]) {
        const state = await livenessCheck(this);
        if (state != null && state !== true && state !== LivenessState.CORRECT) {
          overallState = state;
        }
      }
      return overallState ?? LivenessState.CORRECT;
    };
  }

  if (target.prototype[readinessChecksKey] != null && target.prototype[readinessChecksKey].length > 0) {
    const originalGetReadinessState = target.prototype.getReadinessState;
    target.prototype.getReadinessState = async function getReadinessStateWrapper() {
      let overallState: ReadinessState | undefined;
      if (originalGetReadinessState != null) {
        const state = await originalGetReadinessState.bind(this)();
        if (state != null && state !== true && state !== ReadinessState.ACCEPTING_TRAFFIC) {
          overallState = state;
        }
      }
      for (const readinessCheck of target.prototype[readinessChecksKey]) {
        const state = await readinessCheck(this);
        if (state != null && state !== true && state !== ReadinessState.ACCEPTING_TRAFFIC) {
          overallState = state;
        }
      }
      return overallState ?? ReadinessState.ACCEPTING_TRAFFIC;
    };
  }

  if (target.prototype[appInfoKey] != null && target.prototype[appInfoKey].length > 0) {
    const originalGetAppInfo = target.prototype.getAppInfo;
    target.prototype.getAppInfo = async function getAppInfoWrapper() {
      let overalInfo: {[key: string]: any} = {};
      if (originalGetAppInfo != null) {
        const info = await originalGetAppInfo.bind(this)();
        overalInfo = {
          ...overalInfo,
          ...info,
        };
      }
      for (const readinessCheck of target.prototype[appInfoKey]) {
        const info = await readinessCheck(this);
        overalInfo = {
          ...overalInfo,
          ...info,
        };
      }
      return overalInfo;
    };
  }

  const originalRegisterMetadata = target.constructor.prototype.registerAPIMetadata;
  target.constructor.prototype.registerAPIMetadata = async function registerAPIMetadataWrapper(
    apiMetadataConsumer: APIMetadataConsumer,
  ) {
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
