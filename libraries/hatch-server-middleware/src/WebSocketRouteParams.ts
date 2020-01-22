import {inject, containerSingleton, Logger} from '@launchtray/hatch-util';
import {Request} from 'express';
import WebSocket from 'ws';

@containerSingleton()
export class WebSocketRouteParams {
  constructor(
    @inject('Request') public readonly req: Request,
    @inject('WebSocket') public readonly webSocket: WebSocket,
    @inject('WebSocketServer') public readonly webSocketServer: WebSocket.Server,
    @inject('Logger') public readonly logger: Logger,
    @inject('cookie') public readonly cookie: string,
    @inject('authHeader') public readonly authHeader: string,
  ) {}
}
