import cors from 'cors';
import {Application} from 'express';
import {ServerMiddleware} from '../../hatch-server';
import {inject, injectable} from '../../hatch-util';

@injectable()
export default class CorsMiddleware implements ServerMiddleware {
  constructor(@inject('CORS_WHITELIST') private readonly corsWhitelist: string[]) {
  }

  public async register(app: Application) {
    app.use(cors({
      origin: this.corsWhitelist,
    }));
  }
}
