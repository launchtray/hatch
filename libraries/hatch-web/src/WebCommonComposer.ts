import {Class} from '@launchtray/hatch-util';
import {ActionCreator, Reducer} from 'redux';
import {ElementType} from 'react';

export interface TranslationsDictionary {
  [key: string]: TranslationsDictionary;
}

export type ActionsObject = {[key: string]: ActionsObject | ActionCreator<unknown>};

export interface WebCommonComposition {
  translations?: TranslationsDictionary;
  createRootReducer: () => Reducer;
  actions: ActionsObject;
  appComponent: ElementType;
  webAppManagers?: Array<Class<unknown>>;
  appRootId?: string;
  useHashRouter?: boolean;
}

export type WebCommonComposer = () => Promise<WebCommonComposition>;
