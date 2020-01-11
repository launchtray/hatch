import {Class} from '@launchtray/hatch-util';
import {Reducer} from 'redux';

export interface TranslationsDictionary {
  [key: string]: TranslationsDictionary;
}

export interface WebCommonComposition {
  translations?: TranslationsDictionary;
  createRootReducer: () => Reducer;
  actions: any;
  App: any;
  webAppManagers?: Array<Class<any>>;
}

export type WebCommonComposer = () => Promise<WebCommonComposition>;
