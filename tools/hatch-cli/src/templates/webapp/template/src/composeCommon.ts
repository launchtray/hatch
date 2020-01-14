import {ROOT_CONTAINER} from '@launchtray/hatch-util';
import {WebCommonComposition} from '@launchtray/hatch-web';
import actions from './actions/index';
import App from './components/App';

export default async (): Promise<WebCommonComposition> => {

  return {
    App,
    actions,
    createRootReducer: require('./reducers').createRootReducer,
    webAppManagers: [

    ],
  };
};
