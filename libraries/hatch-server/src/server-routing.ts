import {
  Class,
  DependencyContainer,
  injectable,
  Logger,
  resolveArgs,
} from '@launchtray/hatch-util';
import {Application, NextFunction, Request, RequestHandler, Response} from 'express';
import {BasicRouteParams} from './BasicRouteParams';
import {ServerMiddlewareClass} from './ServerMiddleware';

export type PathParams = string | RegExp | Array<string | RegExp>;
export type RouteDefiner = (server: Application, handler: RequestHandler) => void;

const routeDefinersKey = Symbol('routeDefiners');
const rootContainerKey = Symbol('rootContainer');

const custom = (routeDefiner: RouteDefiner) => {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const requestHandler = (ctlr: any, req: Request, res: Response, next: NextFunction) => {
      const rootContainer = ctlr[rootContainerKey] as DependencyContainer;
      const container = rootContainer.createChildContainer();
      const logger = container.resolve<Logger>('Logger');
      container.register<BasicRouteParams>(BasicRouteParams, {
        useValue: new BasicRouteParams(req, res, next, logger)
      });
      const args = resolveArgs(container, target, propertyKey);
      originalMethod.apply(ctlr, args);
    };

    if (target[routeDefinersKey] == null) {
      target[routeDefinersKey] = [];
    }
    target[routeDefinersKey].push((ctlr: any, server: Application) => {
      routeDefiner(server, (req: Request<any>, res: Response, next: NextFunction) => {
        requestHandler(ctlr, req, res, next)
      });
    });
  };
};

export const assignRootContainerToController = (ctlr: any, container: DependencyContainer) => {
  ctlr[rootContainerKey] = container;
};

export const hasControllerRoutes = (maybeController: any) => {
  return maybeController.prototype[routeDefinersKey] != null;
};

export const middlewareFor = <T extends Class<any>> (target: T): ServerMiddlewareClass => {
  if (!hasControllerRoutes(target)) {
    throw new Error(`Cannot register ${target.name} as middleware, as it has no @routes defined.`);
  }

  const originalRegister = target.prototype.register;
  target.prototype.register = async function(server: Application) {
    if (originalRegister != null) {
      await originalRegister.bind(this)(server);
    }
    target.prototype[routeDefinersKey].forEach((routeDefiner: (controller: any, server: Application) => void) => {
      routeDefiner(this, server);
    });
  };
  return target;
};

type HTTPMethodUnion =
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
  [method in HTTPMethodUnion]:
    (path: PathParams) => any;
};

export interface NonStandardRouteDefiners {
  custom: (routeDefiner: RouteDefiner) => any;
  m_search: (path: PathParams) => any;
}

export type RouteDefiners = StandardRouteDefiners & NonStandardRouteDefiners;

export const controller: <T>() => (target: Class<T>) => void = injectable;

const proxy = {
  get(target: RouteDefiners, method: keyof RouteDefiners) {
    let adjustedMethod: string = method;
    if (method === 'custom') {
      return custom;
    }
    if (method === 'm_search') {
      adjustedMethod = 'm-search';
    }
    return (path: PathParams) => {
      return custom(((server, handler) => {
        const definer = server[adjustedMethod].bind(server) as (path: PathParams, handler: any) => void;
        definer(path, handler);
      }));
    };
  }
};

export default new Proxy({custom} as any, proxy) as RouteDefiners;
