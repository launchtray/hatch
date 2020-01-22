import {inject, containerSingleton, Logger} from '@launchtray/hatch-util';
import {NextFunction, Request, Response} from 'express';

@containerSingleton()
export default class BasicRouteParams {
  constructor(
    @inject('Request') public readonly req: Request,
    @inject('Response') public readonly res: Response,
    @inject('NextFunction') public readonly next: NextFunction,
    @inject('Logger') public readonly logger: Logger,
    @inject('cookie') public readonly cookie: string,
    @inject('authHeader') public readonly authHeader: string,
  ) {}
}
