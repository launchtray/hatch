import {
  Class,
  DependencyContainer,
  injectable,
  resolveParams,
} from '@launchtray/hatch-util';
import express, {Application, NextFunction, Request, RequestHandler, Response, Router} from 'express';
import {
  APIMetadataConsumer,
  APIMetadataParameters,
  Server,
  ServerMiddlewareClass
} from './ServerMiddleware';
import WebSocket from 'ws';
import {OpenAPIMethod, OpenAPIParameter, OpenAPIRequestBody} from './OpenAPI';

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

export type Route = {method?: HTTPMethod, path: PathParams} | PathParams;

const isRouteObject = (route: Route): route is {method?: HTTPMethod, path: PathParams} => {
  return route != null && route['path'] != null;
};

export const requestMatchesRouteList = (req: {url: string, method: string}, routeList: Route[]) => {
  let matches = false;
  if (routeList && routeList.length > 0) {
    let matchesSetter = () => {matches = true};
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
    router({url: req.url, method: req.method} as any, {} as any, () => {});
  }
  return matches;
};

const routeDefinersKey = Symbol('routeDefiners');
const registerMetadataKey = Symbol('registerMetadata');
const rootContainerKey = Symbol('rootContainer');
const wsRoutesKey = Symbol('wsEnabled');
const requestContainerKey = Symbol('requestContainer');

const custom = (routeDefiner: RouteDefiner, registerMetadata?: APIMetadataRegistrar) => {
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
      const args = await resolveParams(container, target, propertyKey);
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
      target[registerMetadataKey].push(registerMetadata);
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

const consumeAPIMetadata = (
  metadata: APIMetadataParameters,
  method: keyof RouteDefiners,
  path: PathParams,
  apiMetadataConsumer: APIMetadataConsumer
) => {
  const apiMethod = convertExpressMethodToOpenAPIMethod(method);
  const parameters: OpenAPIParameter[] = [];
  const apiPath = convertExpressPathToOpenAPIPath(path, metadata.parameters ?? {}, parameters);
  if (apiMethod && apiPath) {
    const apiMetadata = {
      description: metadata.description ?? '',
      method: apiMethod,
      path: apiPath,
      requestBody: metadata.requestBody ?? defaultRequestBody(apiMethod, metadata),
      parameters,
      responses: metadata.responses ?? {
        default: {
          description: '',
        },
      },
    };
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
      if (!server[wsRoutesKey]) {
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
      wss.on('connection',  (webSocket: WebSocket, req: Request) => {
        requestHandler(ctlr, webSocket, req, wss)
          .catch(() => {
            webSocket.terminate();
          });
      });
      server[wsRoutesKey].push({
        matches: (req: Request) => {
          const router = express.Router();
          let matchingRequest = null;
          router.get(path, (req: Request) => {
            matchingRequest = req;
          });
          router(req, {} as any, () => {});
          return matchingRequest;
        },
        wss,
      });
    };
    const registerMetadata = (apiMetadataConsumer: APIMetadataConsumer) => {
      consumeAPIMetadata(metadata, 'get', path, apiMetadataConsumer);
    }
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

export const middlewareFor = <T extends Class<any>> (target: T): ServerMiddlewareClass => {
  if (!hasControllerRoutes(target)) {
    throw new Error(`Cannot register ${target.name} as middleware, as it has no @routes defined.`);
  }

  const originalRegister = target.prototype.register;
  target.prototype.register = async function(
    app: Application,
    server: Server,
    apiMetadataConsumer: APIMetadataConsumer
  ) {
    if (originalRegister != null) {
      await originalRegister.bind(this)(app, server, apiMetadataConsumer);
    }
    target.prototype[routeDefinersKey].forEach((controllerBoundRouteDefiner: ControllerBoundRouteDefiner) => {
      controllerBoundRouteDefiner(this, app, server, apiMetadataConsumer);
    });
  };

  const originalRegisterMetadata = target.constructor.prototype.registerAPIMetadata;
  target.constructor.prototype.registerAPIMetadata = async function(apiMetadataConsumer: APIMetadataConsumer) {
    if (originalRegisterMetadata != null) {
      await originalRegisterMetadata.bind(this)(apiMetadataConsumer);
    }
    target.prototype[registerMetadataKey].forEach((apiMetadataRegistrar: APIMetadataRegistrar) => {
      apiMetadataRegistrar(apiMetadataConsumer);
    });
  };
  return target;
};

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
  m_search: (path: PathParams, metadata?: APIMetadataParameters) => any;
  websocket: (path: PathParams, metadata?: APIMetadataParameters) => any;
}

export type RouteDefiners = StandardRouteDefiners & NonStandardRouteDefiners;

export const controller: <T>() => (target: Class<T>) => void = injectable;

export const convertExpressPathToOpenAPIPath = (
  path: PathParams,
  paramsIn: {
    [key: string]: Partial<OpenAPIParameter>,
  },
  paramsOut: OpenAPIParameter[],
): string | undefined => {
  const nonPathParams = {...paramsIn};
  let newPath: string | undefined = undefined;
  if (typeof path === 'string') {
    newPath = path.replace(/:([A-Za-z0-0_]*)/g, (_, param) => {
      delete nonPathParams[param];
      paramsOut.push({
        ...paramsIn[param],
        name: param,
        in: 'path',
        required: true,
      });
      return `{${param}}`
    });
  }
  Object.keys(nonPathParams).forEach((param) => {
    paramsOut.push({
      name: param,
      in: 'query',
      required: false,
      ...paramsIn[param],
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
        }
      },
    };
  }
  return undefined;
};

const proxy = {
  get(target: RouteDefiners, method: keyof RouteDefiners) {
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
      const registerMetadata = (apiMetadataConsumer: APIMetadataConsumer) => {
        consumeAPIMetadata(metadata, method, path, apiMetadataConsumer);
      }
      return custom(routeDefiner, registerMetadata);
    };
  },
};

export default new Proxy({custom} as any, proxy) as RouteDefiners;
