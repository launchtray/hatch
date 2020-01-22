import {
  controller,
  route,
} from '@launchtray/hatch-server';
import {BasicRouteParams, HTTPResponder} from '@launchtray/hatch-server-middleware';
import {inject, Logger} from '@launchtray/hatch-util';

@controller()
export default class HATCH_CLI_TEMPLATE_VAR_moduleName {

  constructor(@inject('Logger') private readonly logger: Logger) {

  }

  @route.get('/api/example')
  public exampleEndpoint1(responder: HTTPResponder) {
  }

  @route.get('/api/:id')
  public exampleEndpoint2(params: BasicRouteParams) {
    params.res.status(200).send('ID: ' + params.req.params.id);
  }
}
