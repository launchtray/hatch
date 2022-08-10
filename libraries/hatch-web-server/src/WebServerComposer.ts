import {ServerComposer, ServerComposition, ServerMiddlewareClass} from '@launchtray/hatch-server';
import {WebCommonComposition} from '@launchtray/hatch-web';
import {Application, RequestHandler} from 'express';

export interface WebServerComposition extends ServerComposition, WebCommonComposition {
  serverMiddleware?: ServerMiddlewareClass[];
  customizeWebRoutes?: (app: Application, webRequestHandler: RequestHandler) => void;
}

export type WebServerComposer = ServerComposer<WebServerComposition>;
