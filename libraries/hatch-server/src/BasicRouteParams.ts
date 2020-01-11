import {Logger} from '@launchtray/hatch-util';
import {NextFunction, Request, Response} from 'express';

export class BasicRouteParams {
  constructor(
    public readonly req: Request,
    public readonly res: Response,
    public readonly next: NextFunction,
    public readonly logger: Logger,
  ) {}
}
