import {middlewareFor, ServerComposition} from '@launchtray/hatch-server';
import {
  JSONBodyParser,
  RequestLogger,
  RouteNotFound,
} from '@launchtray/hatch-server-middleware';
import {ROOT_CONTAINER} from '@launchtray/hatch-util';

const appName = process.env.APP_NAME || 'HATCH_CLI_TEMPLATE_VAR_projectName-server';

export default async (): Promise<ServerComposition> => {

  ROOT_CONTAINER.register('appName', {useValue: appName});
  ROOT_CONTAINER.register('serverLogFile', {useValue: 'server.log'});
  ROOT_CONTAINER.register('logLevel', {useValue: 'debug'});

  return {
    serverMiddleware: [
      JSONBodyParser,
      RequestLogger,
      RouteNotFound, // Catch-all 404 for unimplemented APIs
    ],
  };
};
