import {ServerMiddleware} from '@launchtray/hatch-server';
import {injectable} from '@launchtray/hatch-util';
import cookieParser from 'cookie-parser';
import {Application} from 'express';

@injectable()
export default class CookieParser implements ServerMiddleware {
  public async register(app: Application) {
    app
      .use(cookieParser());
  }
}