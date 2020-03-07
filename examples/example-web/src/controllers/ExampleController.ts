import {
  controller,
  route,
  ServerMiddleware,
} from '@launchtray/hatch-server';
import {BasicRouteParams, HTTPResponder, WebSocketRouteParams} from '@launchtray/hatch-server-middleware';
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

  @route.get('/api/greeting', {
    parameters: {
      name: {
        description: 'Example greeting endpoint using a query param',
      },
    },
  })
  public parseQueryParam(responder: HTTPResponder) {
    const name = responder.params.req.query.name;
    if (name) {
      responder.ok(`Hello, ${responder.params.req.query.name}!`);
    } else {
      responder.ok('Hello!');
    }
  }

  @route.post('/api/processBody', {
    requestBody: {
      description: 'Example request body',
      content: { // Note: the following below could be defined as a constant for reuse, etc.
        'application/json': {
          schema: {
            type: 'object',
            required: [
              'name'
            ],
            properties: {
              name: {
                type: 'string'
              },
              age: {
                type: 'integer',
                format: 'int32',
                minimum: 0
              }
            }
          }
        }
      }
    }
  })
  public processBody(responder: HTTPResponder) {
    const name = responder.params.req.body.name;
    const age = responder.params.req.body.age;
    if (age) {
      responder.ok(`Processed age of ${name}: ${age}`);
    } else {
      responder.ok(`Age of ${name} is unknown`);
    }
  }

  @route.post('/api/processBodyWithoutSpec')
  public processBodyWithoutSpec(responder: HTTPResponder) {
    this.processBody(responder);
  }

  @route.get('/api/person/:id', {
    parameters: {
      id: {
        description: 'The person\'s identifier',
      },
    },
  })
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
