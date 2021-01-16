import {AnyAction, Reducer} from 'redux';

import {ActionDefinition, isActionType} from './defineAction';

export type PayloadReducer<S, P> = (
  state: Readonly<S>,
  payload: P
) => S;

interface ReducerDefinition<S> {
  on<P>(actionCreator: ActionDefinition<P>, reducer: PayloadReducer<S, P>): CallableReducerDefinition<S>;
}

interface CallableReducerDefinition<S> extends ReducerDefinition<S>, Reducer<S> {
  (state: S | undefined, action: AnyAction): S;
}

class ReducerDefinitionImpl<S> implements ReducerDefinition<S> {
  private readonly handlers: {[key: string]: (state: S, action: AnyAction) => S} = {};
  private readonly rootReducer: CallableReducerDefinition<S>;

  constructor(private readonly initialState: S) {
    this.initialState = initialState;
    this.handlers = {};
    const rootReducer = (state = this.initialState, action: AnyAction): S => {
      const handler = this.handlers[action.type];
      if (handler != null) {
        return handler(state, action);
      }
      return state;
    };
    rootReducer.on = this.on.bind(this);
    this.rootReducer = rootReducer;
  }

  public on<P>(actionCreator: ActionDefinition<P>, reducer: PayloadReducer<S, P>): CallableReducerDefinition<S> {
    if (this.handlers[actionCreator.type]) {
      throw new Error('Duplicate definition of reducer handler for action: ' + actionCreator.type);
    }
    this.handlers[actionCreator.type] = (state: S, action: AnyAction): S => {
      if (isActionType(actionCreator, action)) {
        return reducer(state, action.payload);
      }
      return state;
    };
    return this.rootReducer;
  }

  public createReducer(): CallableReducerDefinition<S> {
    return this.rootReducer;
  }
}

export function defineReducer<S>(initialState: S): CallableReducerDefinition<S> {
  return new ReducerDefinitionImpl<S>(initialState).createReducer();
}

export default defineReducer;
