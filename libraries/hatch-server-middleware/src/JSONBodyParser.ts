import {ServerMiddleware} from '@launchtray/hatch-server';
import {injectable} from '@launchtray/hatch-util';
import express, {Application} from 'express';

@injectable()
export default class JSONBodyParser implements ServerMiddleware {
  public async register(server: Application) {
    server.use(express.json());
  }
}
