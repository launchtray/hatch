import {ServerComposition} from '@launchtray/hatch-server';
import {
  JSONBodyParser,
  RequestLogger,
  RouteNotFound,
} from '@launchtray/hatch-server-middleware';
import {ROOT_CONTAINER} from '@launchtray/hatch-util';

export default async (): Promise<ServerComposition> => {
  ROOT_CONTAINER.register('appName', {useValue: 'HATCH_CLI_TEMPLATE_VAR_projectShortName-server'});

  return {
    serverMiddleware: [
      JSONBodyParser,
      RequestLogger,
      RouteNotFound, // Catch-all 404 for unimplemented APIs
    ],
  };
};
