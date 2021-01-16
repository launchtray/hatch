import {
  JSONBodyParser,
  RequestLogger,
  RouteNotFound,
} from '@launchtray/hatch-server-middleware';
import {ROOT_CONTAINER} from '@launchtray/hatch-util';
import {WebServerComposition} from '@launchtray/hatch-web-server';
import composeCommon from './composeCommon';

export default async (): Promise<WebServerComposition> => {

  ROOT_CONTAINER.register('appName', {useValue: 'HATCH_CLI_TEMPLATE_VAR_projectShortName-server'});

  const commonComposition = await composeCommon();

  return {
    ...commonComposition,
    serverMiddleware: [
      JSONBodyParser,
      RequestLogger,
      RouteNotFound, // Catch-all 404 for unimplemented APIs
    ],
  };
};
