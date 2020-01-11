import {ServerMiddlewareClass} from './ServerMiddleware';

export interface ServerComposition {
  serverMiddleware?: ServerMiddlewareClass[];
}

export type ServerComposer<T extends ServerComposition> = () => Promise<T>;
