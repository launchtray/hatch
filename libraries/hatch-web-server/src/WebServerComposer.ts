import {ServerComposer, ServerComposition, ServerMiddlewareClass} from '@launchtray/hatch-server';
import {Logger} from '@launchtray/hatch-util';
import {WebCommonComposition} from '@launchtray/hatch-web';

export interface WebServerComposition extends ServerComposition, WebCommonComposition {
  logger: Logger;
  serverMiddleware?: ServerMiddlewareClass[];
}

export type WebServerComposer = ServerComposer<WebServerComposition>;
