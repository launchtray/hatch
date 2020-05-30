import {middlewareFor} from '@launchtray/hatch-server';
import {
  JSONBodyParser,
  RequestLogger,
  RouteNotFound,
} from '@launchtray/hatch-server-middleware';
import {UserManagementController} from '@launchtray/hatch-server-user-management';
import {AWSCognitoClient} from '@launchtray/hatch-server-user-management/dist';
import {ROOT_CONTAINER} from '@launchtray/hatch-util';
import {WebServerComposition} from '@launchtray/hatch-web-server';
import composeCommon from './composeCommon';
import ExampleController from './controllers/ExampleController';

const appName = process.env.APP_NAME || 'hatch-server';

export default async (): Promise<WebServerComposition> => {

  ROOT_CONTAINER.register('appName', {useValue: appName});
  ROOT_CONTAINER.register('serverLogFile', {useValue: 'server.log'});
  ROOT_CONTAINER.register('logLevel', {useValue: 'debug'});
  ROOT_CONTAINER.register('customAuthWhitelist', {useValue: []});
  ROOT_CONTAINER.register('UserServiceClient', AWSCognitoClient);

  const commonComposition = await composeCommon();

  return {
    ...commonComposition,
    serverMiddleware: [
      JSONBodyParser,
      RequestLogger,
      middlewareFor(ExampleController),
      middlewareFor(UserManagementController), // this should go before all controllers that require authentication
      RouteNotFound, // Catch-all 404 for unimplemented APIs
    ],
  };
};
