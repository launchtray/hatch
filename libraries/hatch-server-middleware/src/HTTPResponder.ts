import {BasicRouteParams} from '@launchtray/hatch-server';
import {containerSingleton} from '@launchtray/hatch-util';

@containerSingleton()
export default class HTTPResponder {
  constructor(public readonly params: BasicRouteParams) {}

  public ok(body?: any) {
    this.params.res.status(200).send(body);
  }
}