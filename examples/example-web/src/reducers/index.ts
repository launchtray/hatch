import {createNavReducers} from '@launchtray/hatch-web';
import {combineReducers} from 'redux';
import exampleReducer from './exampleReducer';

export const createRootReducer = () => {
  return combineReducers({
    ...createNavReducers(),
    exampleReducer,
  });
};
