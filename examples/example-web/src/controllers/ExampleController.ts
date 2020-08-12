import {
  controller,
  route,
  ServerMiddleware,
} from '@launchtray/hatch-server';
import {BasicRouteParams, HTTPResponder, WebSocketRouteParams} from '@launchtray/hatch-server-middleware';
import {AUTH_BLACKLIST_KEY, AUTH_WHITELIST_KEY, UserContext} from '@launchtray/hatch-server-user-management';
import {containerSingleton, delay, initializer, inject, Logger} from '@launchtray/hatch-util';
import {Application} from 'express';
import WebSocket from 'ws';

@containerSingleton()
class CustomResponder {
  public params: BasicRouteParams;
  public testField!: string;

  constructor(@inject('Logger') private readonly logger: Logger, public readonly responder: HTTPResponder) {
    logger.info('Instantiating CustomResponder');
    this.params = responder.params;
  }

  @initializer()
  private async init() {
    this.logger.info('Initializing CustomResponder');
    this.testField = 'CustomResponder';
  }

  public ok(body?: any) {
    this.responder.ok(body);
  }

  public next() {
    this.params.next();
  }
}

// tslint:disable-next-line:max-classes-per-file
@controller()
export default class ExampleController implements ServerMiddleware {
  private readonly testVar: string;
  constructor(
    @inject('Logger') private readonly logger: Logger,
    @inject('awsRegion') private readonly awsRegion: string,
  ) {
    this.testVar = 'A';
  }

  @route.all('/api/example*', {tokens: [AUTH_WHITELIST_KEY]})
  public catchallEndpoint(responder: CustomResponder) {
    this.logger.info('Catch-all endpoint called');
    responder.next();
  }

  @route.get('/api/example')
  public exampleEndpoint(responder: CustomResponder) {
    this.logger.info('Example endpoint called');
    responder.ok(`Example GET for region: ${this.awsRegion}`);
  }

  @route.get('/api/example/date')
  public getCurrentDate(responder: CustomResponder) {
    this.logger.info('Time endpoint called');
    responder.ok(`${new Date().toISOString()}`);
  }

  @route.get('/api/example/cachedDate')
  public getCachedDate(responder: CustomResponder) {
    responder.params.res.set('Cache-Control', 'max-age=60');
    this.logger.info('Time endpoint called');
    responder.ok(`${new Date().toISOString()}`);
  }

  @route.get('/api/example/echo')
  public echo(responder: CustomResponder) {
    responder.ok(`${JSON.stringify({
      headers: responder.params.req.headers,
      params: responder.params.req.params,
      cookie: responder.params.cookie,
    })}`);
  }

  @route.get('/api/example/blacklisted', {tokens: [AUTH_BLACKLIST_KEY]})
  public exampleBlacklistedEndpoint(responder: CustomResponder) {
    this.logger.info('Blacklisted endpoint called');
    responder.ok('Example blacklisted GET');
  }

  @route.get('/api/whoami')
  public whoAmI(responder: CustomResponder, userContext: UserContext) {
    responder.ok(userContext.username);
  }

  @route.custom((app, server, handler) => {
    app.get('/api/example2', handler);
  })
  public exampleEndpoint2(responder: CustomResponder) {
    responder.ok(this.testVar);
  }

  @route.get('/api/example/greeting', {
    parameters: {
      name: {
        description: 'Example greeting endpoint using a query param',
      },
    },
  })
  public parseQueryParam(responder: CustomResponder) {
    const name = responder.params.req.query.name;
    if (name) {
      responder.ok(responder.testField + `: Hello, ${responder.params.req.query.name}!`);
    } else {
      responder.ok(responder.testField + ': Hello!');
    }
  }

  @route.post('/api/example/processBody', {
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
  public processBody(responder: CustomResponder) {
    const name = responder.params.req.body.name;
    const age = responder.params.req.body.age;
    if (age != null) {
      responder.ok(`Processed age of ${name}: ${age}`);
    } else {
      responder.ok(`Age of ${name} is unknown`);
    }
  }

  @route.post('/api/example/processBodyWithoutSpec')
  public processBodyWithoutSpec(responder: CustomResponder) {
    this.processBody(responder);
  }

  @route.get('/api/example/person/:id', {
    parameters: {
      id: {
        description: 'The person\'s identifier',
      },
    },
  })
  public personEndpoint(params: BasicRouteParams) {
    params.res.status(200).send('Person: ' + params.req.params.id);
  }

  @route.get('/api/example/error')
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
