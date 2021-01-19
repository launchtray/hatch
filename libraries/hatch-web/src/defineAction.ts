import {Action as ReduxAction, ActionCreator, AnyAction} from 'redux';

export interface Action<P> extends ReduxAction<string> {
  payload: P;
}

export const isActionType = <P>(actionDefinition: ActionDefinition<P>, action: AnyAction): action is Action<P> => {
  return action.type !== undefined && action.type === actionDefinition.type;
};

export interface ActionDefinition<P> extends ActionCreator<Action<P>> {
  (payload: P): Action<P>;
  type: string;
  toString: () => string;
}

const createActionCreator = <P>(type: string) => {
  const actionCreator: ActionDefinition<P> = (payload: P) => ({type, payload});
  actionCreator.type = type;
  actionCreator.toString = () => type;
  return actionCreator;
};

export const resetDefinedActions = () => {
  definedActions = {};
};

const DETECT_DUPLICATE_ACTIONS = true;
let definedActions = {};
export default {
  type: (type: string) => {
    if (DETECT_DUPLICATE_ACTIONS) {
      if (definedActions[type]) {
        throw new Error('Duplicate definition of action type: ' + type);
      }
      definedActions[type] = true;
    }
    return {
      payload: <P>() => createActionCreator<P>(type),
    };
  },
};
