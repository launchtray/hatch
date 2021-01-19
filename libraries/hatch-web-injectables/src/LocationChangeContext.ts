import {match} from 'react-router';
import {Store} from 'redux';

import {Location} from '@launchtray/hatch-web';
import {inject, containerSingleton} from '@launchtray/hatch-util';

@containerSingleton()
export default class LocationChangeContext<Params extends {[K in keyof Params]?: string} = Record<string, never>> {
  constructor(
    @inject('pathMatch') public readonly pathMatch: match<Params>,
    @inject('Location') public readonly location: Location,
    @inject('isServer') public readonly isServer: boolean,
    @inject('Store') public readonly store: Store,
    @inject('cookie') public readonly cookie: string,
    @inject('authHeader') public readonly authHeader: string,
  ) {}
}
