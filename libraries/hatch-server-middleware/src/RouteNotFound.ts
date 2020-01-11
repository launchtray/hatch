import {ServerMiddleware} from '@launchtray/hatch-server';
import {injectable} from '@launchtray/hatch-util';
import {Application} from 'express';

@injectable()
export default class RouteNotFound implements ServerMiddleware {
  public async register(server: Application) {
    server
      .get('/api/*', (req, res) => {
        res.status(404).send();
      });
  }
}
