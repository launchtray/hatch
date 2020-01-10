import {Logger} from '@launchtray/hatch-util';
import {ServerMiddlewareClass} from './ServerMiddleware';

export interface ServerComposition {
  logger: Logger;
  serverMiddleware?: ServerMiddlewareClass[];
}

export type ServerComposer<T extends ServerComposition> = () => Promise<T>;
