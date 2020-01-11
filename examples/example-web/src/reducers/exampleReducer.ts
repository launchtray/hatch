import {defineReducer} from '@launchtray/hatch-web';
import actions from '../actions/index';

export default defineReducer({
  numberState: 97,
  stringState: '',
})
  .on(actions.exampleAction, (state, payload) => {
    return {
      ...state,
      stringState: payload.stringField,
      why: 1, // TODO: why does this not cause a compiler error?
    };
  })
  .on(actions.exampleAction2, (state, payload) => ({
    ...state,
    numberState: payload.numberField,
  }))
  .on(actions.nav.mediaChange, (state) => ({
    ...state,
    numberState: 44,
  }));
