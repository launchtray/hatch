import {defineReducer} from '@launchtray/hatch-web';
import actions from '../actions/index';

const initialState = {

};

export default defineReducer(initialState)
  .on(actions.REPLACE_ME, (state, payload) => ({
    ...state,
  }));
