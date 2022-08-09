import {ROOT_CONTAINER} from '@launchtray/hatch-util';
import {WebCommonComposition} from '@launchtray/hatch-web';
import actions from './actions/index';
import App from './components/App';
import ExampleManager, {ExampleDependencyForManager} from './managers/ExampleManager';

export default async (): Promise<WebCommonComposition> => {
  ROOT_CONTAINER.registerSingleton(ExampleDependencyForManager);

  return {
    appComponent: App,
    actions,
    createRootReducer: require('./reducers').createRootReducer,
    webAppManagers: [
      ExampleManager,
    ],
    useHashRouter: true,
  };
};
