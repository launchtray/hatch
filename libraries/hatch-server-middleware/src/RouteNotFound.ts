import {ServerMiddleware} from '@launchtray/hatch-server';
import {injectable} from '@launchtray/hatch-util';
import {Application} from 'express';

@injectable()
export default class RouteNotFound implements ServerMiddleware {
  public async register(app: Application) {
    app
      .get('/api/*', (req, res) => {
        res.status(404).send();
      });
  }
}
