import {
  BasicRouteParams,
  controller,
  route,
  ServerMiddleware,
  WebSocketRouteParams
} from '@launchtray/hatch-server';
import {HTTPResponder} from '@launchtray/hatch-server-middleware';
import {delay, inject, Logger} from '@launchtray/hatch-util';
import {Application} from 'express';
import WebSocket from 'ws';

@controller()
export default class ExampleController implements ServerMiddleware {
  private readonly testVar: string;
  constructor(@inject('Logger') private readonly logger: Logger) {
    this.testVar = 'A';
  }

  @route.get('/api/example')
  public exampleEndpoint(responder: HTTPResponder) {
    this.logger.info('Example endpoint called');
    responder.ok('Example GET');
  }

  @route.custom((app, server, handler) => {
    app.get('/api/example2', handler);
  })
  public exampleEndpoint2(responder: HTTPResponder) {
    responder.ok(this.testVar);
  }

  @route.get('/api/person/:id')
  public personEndpoint(params: BasicRouteParams) {
    params.res.status(200).send('Person: ' + params.req.params.id);
  }

  @route.get('/api/error')
  public async errorEndpoint(params: BasicRouteParams) {
    await delay(1000);
    throw new Error('Test error');
  }

  @route.websocket('/ws/:id')
  public async handleWebsocket(params: WebSocketRouteParams) {
    this.logger.debug('handleWebsocket: ' + params.req.url);
    const ws = params.webSocket;
    ws.on('message', (msg: string) => {
      params.webSocketServer.clients.forEach((client: WebSocket) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(params.req.params.id + ': ' + msg);
        }
      });
    });
  }

  public async register(app: Application): Promise<void> {
    this.logger.info('Calling original register:', this.testVar);
  }
}
