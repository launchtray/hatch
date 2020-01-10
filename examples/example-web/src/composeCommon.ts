import {Logger, ROOT_CONTAINER} from '@launchtray/hatch-util';
import {WebCommonComposition} from '@launchtray/hatch-web';
import actions from './actions/index';
import App from './components/App';
import ExampleManager, {ExampleDependencyForManager} from './managers/ExampleManager';

export default async (): Promise<WebCommonComposition> => {
  const logger = ROOT_CONTAINER.resolve<Logger>('Logger');
  logger.debug('composeCommon');
  ROOT_CONTAINER.registerSingleton(ExampleDependencyForManager);

  return {
    logger,
    App,
    actions,
    createRootReducer: require('./reducers').createRootReducer,
    webAppManagers: [
      ExampleManager,
    ],
  };
};
