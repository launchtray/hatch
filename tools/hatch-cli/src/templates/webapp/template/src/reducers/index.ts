import {createNavReducers} from '@launchtray/hatch-web';
import {combineReducers} from 'redux';

export const createRootReducer = () => {
  return combineReducers({
    ...createNavReducers(),

  });
};
