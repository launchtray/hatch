import {middlewareFor} from '@launchtray/hatch-server';
import {
  JSONBodyParser,
  RequestLogger,
  RouteNotFound,
} from '@launchtray/hatch-server-middleware';
import {
  AUTH_WHITELIST_KEY,
  AWSCognitoClient,
  UserManagementController
} from '@launchtray/hatch-server-user-management';
import {ROOT_CONTAINER} from '@launchtray/hatch-util';
import {WebServerComposition} from '@launchtray/hatch-web-server';
import composeCommon from './composeCommon';
import ExampleController from './controllers/ExampleController';

const appName = process.env.APP_NAME || 'hatch-server';

export default async (): Promise<WebServerComposition> => {

  ROOT_CONTAINER.register('appName', {useValue: appName});
  ROOT_CONTAINER.register('serverLogFile', {useValue: 'server.log'});
  ROOT_CONTAINER.register('logLevel', {useValue: 'debug'});
  ROOT_CONTAINER.register('UserManagementClient', AWSCognitoClient);
  ROOT_CONTAINER.register(AUTH_WHITELIST_KEY, {useValue: '/'});
  ROOT_CONTAINER.register(AUTH_WHITELIST_KEY, {useValue: '/hello'});
  ROOT_CONTAINER.register(AUTH_WHITELIST_KEY, {useValue: '/hi'});
  ROOT_CONTAINER.register(AUTH_WHITELIST_KEY, {useValue: '/example'});

  ROOT_CONTAINER.register('awsAccessKeyId', {useValue: process.env.AWS_USER_POOL_ID});
  ROOT_CONTAINER.register('awsSecretAccessKey', {useValue: process.env.AWS_ACCESS_KEY_ID});
  ROOT_CONTAINER.register('awsRegion', {useValue: process.env.AWS_REGION});
  ROOT_CONTAINER.register('awsUserPoolId', {useValue: process.env.AWS_USER_POOL_ID});
  ROOT_CONTAINER.register('awsClientId', {useValue: process.env.AWS_CLIENT_ID});

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
