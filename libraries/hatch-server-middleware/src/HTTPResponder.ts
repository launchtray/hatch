import {containerSingleton} from '@launchtray/hatch-util';

import BasicRouteParams from './BasicRouteParams';

@containerSingleton()
export default class HTTPResponder {
  constructor(public readonly params: BasicRouteParams) {}

  public ok(body?: unknown) {
    this.params.res.status(200).send(body);
  }
}
