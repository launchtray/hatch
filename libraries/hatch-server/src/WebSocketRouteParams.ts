import {Logger} from '@launchtray/hatch-util';
import {NextFunction, Request} from 'express';
import WebSocket from 'ws';

export class WebSocketRouteParams {
  constructor(
    public readonly req: Request,
    public readonly webSocket: WebSocket,
    public readonly webSocketServer: WebSocket.Server,
    public readonly logger: Logger,
  ) {}
}
