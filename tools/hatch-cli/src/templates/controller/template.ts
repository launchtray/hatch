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
export default class HATCH_CLI_TEMPLATE_VAR_moduleName implements ServerMiddleware {

  constructor(@inject('Logger') private readonly logger: Logger) {

  }

  public async register(server: Application): Promise<void> {

  }

  @route.get('/api/example')
  public exampleEndpoint1(responder: HTTPResponder) {
  }

  @route.get('/api/:id')
  public exampleEndpoint2(params: BasicRouteParams) {
    params.res.status(200).send('ID: ' + params.req.params.id);
  }
}
