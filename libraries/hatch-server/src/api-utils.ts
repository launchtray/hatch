import {Response} from 'express';
import stream from 'stream';
import {
  ApiAlternateAction,
  preventsDefaultResponse,
  getAlternateAction,
  getStatusCode,
  isApiAlternateAction,
  isApiError,
  isStream,
} from '@launchtray/hatch-util';

export const alternateActionResponseSent = (
  delegateResponse: unknown,
  res: Response,
): delegateResponse is ApiAlternateAction => {
  if (isApiAlternateAction(delegateResponse)) {
    if (preventsDefaultResponse(delegateResponse)) {
      return true;
    }
    const statusCode = getStatusCode(delegateResponse);
    if (delegateResponse.headers != null) {
      res.set(delegateResponse.headers);
    }
    if (statusCode != null) {
      const contentTypeHeader: string | undefined = delegateResponse.headers?.['Content-Type'] as string | undefined;
      res.status(statusCode);
      const {body} = delegateResponse as {body?: any};
      if (body == null) {
        res.end();
      } else if (isStream(body)) {
        res.set('Content-Type', contentTypeHeader ?? 'application/octet-stream');
        // https://stackoverflow.com/questions/73308289
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        stream.Readable.fromWeb(body).pipe(res);
      } else {
        if (typeof body === 'string') {
          res.set('Content-Type', contentTypeHeader ?? 'text/plain');
        } else {
          res.set('Content-Type', contentTypeHeader ?? 'application/json');
        }
        res.send(body);
      }
      return true;
    }
    res.set('Content-Type', 'text/plain');
    res.status(500).send('Unknown alternate action');
    return true;
  }
  return false;
};

export const apiErrorResponseSent = (err: unknown, res: Response): boolean => {
  if (isApiError(err)) {
    try {
      const altAction = getAlternateAction(err);
      if (alternateActionResponseSent(altAction, res)) {
        return true;
      }
    } catch (err: unknown) {
      return false;
    }
  }
  return false;
};
