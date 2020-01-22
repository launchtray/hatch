import {match} from 'react-router';
import {Store} from 'redux';
import {Location} from './NavProvider';

export default class LocationChangeContext<Params extends { [K in keyof Params]?: string } = {}> {
  constructor(
    public readonly pathMatch: match<Params>,
    public readonly location: Location,
    public readonly isServer: boolean,
    public readonly store: Store,
    public readonly cookie?: string,
    public readonly authHeader?: string,
  ) {}
}
