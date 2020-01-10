import {
  BasicRouteParams,
  controller,
  route,
  ServerMiddleware
} from '@launchtray/hatch-server';
import {HTTPResponder} from '@launchtray/hatch-server-middleware';
import {inject, Logger} from '@launchtray/hatch-util';
import {Application} from 'express';

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

  @route.custom((server, handler) => {
    server.get('/api/example2', handler);
  })
  public exampleEndpoint2(responder: HTTPResponder) {
    responder.ok(this.testVar);
  }

  @route.get('/api/person/:id')
  public personEndpoint(params: BasicRouteParams) {
    params.res.status(200).send('Person: ' + params.req.params.id);
  }

  public async register(server: Application): Promise<void> {
    this.logger.info('Calling original register:', this.testVar);
  }
}
