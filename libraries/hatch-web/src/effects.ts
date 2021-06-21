/* eslint-disable no-redeclare, @typescript-eslint/no-explicit-any -- intentional overloads and heterogeneous arrays */
import {Saga} from 'redux-saga';
import {
  all as sagaAll,
  call as sagaCall,
  delay as sagaDelay,
  Effect as SagaEffect,
  fork as sagaFork,
  put as sagaPut,
  race as sagaRace,
  take as sagaTake,
  takeEvery as sagaTakeEvery,
  takeLatest as sagaTakeLatest,
} from 'redux-saga/effects';
import {Action, ActionDefinition} from './defineAction';

type Unpromisify<T> = T extends Promise<infer R> ? R : T;
type ValueGenerator<V> = Generator<SagaEffect<any>, V, any>;
type GeneratorReturnType<R> = R extends ValueGenerator<infer V> ? V : Unpromisify<R>;
type AnyGenerator = ValueGenerator<any>;
type ActionGenerator<P> = ValueGenerator<Action<P>>;

function take<P>(actionPattern: ActionDefinition<P>): ActionGenerator<P>;

// The result of this should be checked with isActionType to narrow the type
function take(actionDefs: Array<ActionDefinition<any>>): ActionGenerator<any>;

function* take(actionPattern: ActionDefinition<any> | Array<ActionDefinition<any>>): ActionGenerator<any> {
  return yield sagaTake(actionPattern);
}

type Worker<P> = (action: Action<P>) => any;

function takeEvery<P>(actionPattern: ActionDefinition<P>, worker: Worker<P>): AnyGenerator;

// The result of this should be checked with isActionType to narrow the type
function takeEvery(actionDefs: Array<ActionDefinition<any>>, worker: Worker<any>): AnyGenerator;

function* takeEvery(
  actionPattern: ActionDefinition<any> | Array<ActionDefinition<any>>,
  worker: Worker<any>,
): AnyGenerator {
  return yield sagaTakeEvery(actionPattern, worker);
}

function takeLatest<P>(actionPattern: ActionDefinition<P>, worker: Worker<P>): AnyGenerator;

// The result of this should be checked with isActionType to narrow the type
function takeLatest(actionDefs: Array<ActionDefinition<any>>, worker: Worker<any>): AnyGenerator;

function* takeLatest(
  actionPattern: ActionDefinition<any> | Array<ActionDefinition<any>>,
  worker: Worker<any>,
): AnyGenerator {
  return yield sagaTakeLatest(actionPattern, worker);
}

function* call<Method extends(...methodArgs: any[]) => any>(method: [any, Method], ...args: Parameters<Method>):
  ValueGenerator<Unpromisify<ReturnType<Method>>> {
  // Disallow call without context. Must be set to null explicitly for free functions.
  if (method[0] != null) {
    return yield sagaCall(method, ...args);
  }
  return yield sagaCall(method[1], ...args);
}

function race<T extends {[k: string]: any}>(effects: T): ValueGenerator<{[E in keyof T]?: GeneratorReturnType<T[E]>}>;

function race<T>(effects: T[]): ValueGenerator<GeneratorReturnType<T>>;

function* race<T extends {[k: string]: any}>(effects: T): ValueGenerator<{[E in keyof T]?: GeneratorReturnType<T[E]>}> {
  return yield sagaRace(effects as any);
}

export default {
  take,
  takeEvery,
  takeLatest,
  call,
  race,
  all: sagaAll,
  fork: sagaFork,
  delay: sagaDelay,
  put: sagaPut,
};

export type Effect = Promise<any> | ValueGenerator<any> | Saga | SagaEffect;
