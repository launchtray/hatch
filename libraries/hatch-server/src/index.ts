import createMicroservice from './createMicroservice';
import createServer, {CreateServerOptions} from './createServer';
import route, {
  assignRootContainerToController,
  controller,
  hasControllerRoutes,
  middlewareFor
} from './server-routing';
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
  route,
  controller,
  createServer,
  ServerMiddleware,
  ServerMiddlewareClass,
  middlewareFor,
  assignRootContainerToController,
  hasControllerRoutes,
  registerServerMiddleware,
  resolveServerMiddleware,
  ServerComposer,
  ServerComposition,
  CreateServerOptions,
  Server,
  createMicroservice,
  APIMetadataParameters,
};
