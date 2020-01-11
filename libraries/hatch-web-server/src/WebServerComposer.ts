import {ServerComposer, ServerComposition, ServerMiddlewareClass} from '@launchtray/hatch-server';
import {WebCommonComposition} from '@launchtray/hatch-web';

export interface WebServerComposition extends ServerComposition, WebCommonComposition {
  serverMiddleware?: ServerMiddlewareClass[];
}

export type WebServerComposer = ServerComposer<WebServerComposition>;
