import createMicroservice from './createMicroservice';
import createServer, {CreateServerOptions} from './createServer';
import route, {
  assignRootContainerToController,
  controller,
  hasControllerRoutes,
  HTTPMethod,
  middlewareFor,
  requestMatchesRouteList,
  Route,
} from './server-routing';
import {
  addStaticRoutes,
  loadStaticAssetsMetadata,
} from './server-utils';
import {
  ServerComposer,
  ServerComposition,
} from './ServerComposer';
import {
  APIMetadataParameters,
  registerServerMiddleware,
  resolveServerMiddleware,
  Server,
  ServerMiddleware,
  ServerMiddlewareClass,
} from './ServerMiddleware';

export {
  addStaticRoutes,
  APIMetadataParameters,
  route,
  controller,
  createServer,
  ServerMiddleware,
  ServerMiddlewareClass,
  middlewareFor,
  requestMatchesRouteList,
  Route,
  assignRootContainerToController,
  hasControllerRoutes,
  HTTPMethod,
  registerServerMiddleware,
  resolveServerMiddleware,
  ServerComposer,
  ServerComposition,
  CreateServerOptions,
  Server,
  createMicroservice,
  loadStaticAssetsMetadata,
};
