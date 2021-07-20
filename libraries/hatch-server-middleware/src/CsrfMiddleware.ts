import {ServerMiddleware} from '@launchtray/hatch-server';
import {injectable} from '@launchtray/hatch-util';
import {Application, NextFunction, Response, Request} from 'express';
import cookie from 'cookie';
import createHttpError from 'http-errors';
import {StatusCodes} from 'http-status-codes';

@injectable()
export default class CsrfMiddleware implements ServerMiddleware {
  public async register(app: Application) {
    app.use(isCsrfSafe);
  }
}

const isMethodSideEffectSafe = (method: string): boolean => {
  return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
};

const isCsrfSafe = (req: Request, res: Response, next: NextFunction) => {
  // If the auth header is set, this cannot be CSRF, since an attacker cannot set headers
  if (req.headers.authorization != null && req.headers.authorization !== '') {
    next();
    return;
  }
  // If bypass header is set, this cannot be CSRF, since an attacker cannot set headers
  const bypassDSCHeader = req.header('x-bypass-csrf-check');
  const bypassDSC = (bypassDSCHeader != null && bypassDSCHeader.toLocaleLowerCase() === 'true');
  if (bypassDSC) {
    next();
    return;
  }
  // Method is (supposed to be) safe. If the request has side effects, the application is flawed.
  if (isMethodSideEffectSafe(req.method)) {
    next();
    return;
  }
  // Otherwise, guard against CSRF via a double-submit cookie
  let cookies = null;
  if (req.headers.cookie != null) {
    cookies = cookie.parse(req.headers.cookie);
  }
  const doubleSubmitCookie = cookies?.double_submit;
  const doubleSubmitParam = req.body.doubleSubmitCookie;
  if (doubleSubmitCookie != null
      && doubleSubmitCookie !== ''
      && doubleSubmitCookie === doubleSubmitParam) {
    next();
    return;
  }
  const errMsg = 'Rejecting request due to CSRF check';
  // eslint-disable-next-line no-console
  console.error(errMsg);
  next(createHttpError(StatusCodes.UNAUTHORIZED, errMsg));
};
