import {
  CALL_HISTORY_METHOD,
  ConnectedRouter,
  connectRouter,
  LOCATION_CHANGE,
  push,
  routerMiddleware,
  RouterState,
} from 'connected-react-router';
import {createBrowserHistory, createHashHistory, History, Location as HistoryLocation} from 'history';
import React, {ReactElement} from 'react';
import {connect} from 'react-redux';
import {StaticRouter} from 'react-router-dom';
import {Action, AnyAction, Dispatch, Reducer} from 'redux';
import defineAction, {ActionDefinition, isActionType} from './defineAction';
import MediaQueryContext, {mediaChangeAction} from './MediaQueryContext';

export interface Location {
  path: string;
  query: string;
  fragment: string;
}

export const convertToLocation = (historyLocation: HistoryLocation): Location => {
  return {
    path: historyLocation.pathname,
    query: historyLocation.search,
    fragment: historyLocation.hash,
  };
};

export const patchPreloadedStateForClientNav = (
  preloadedState: {router: {location: HistoryLocation}},
  location: Location,
) => {
  const locationFromServer = preloadedState.router?.location != null
    ? convertToLocation(preloadedState.router.location) : undefined;
  if (
    (locationFromServer?.path == null && locationFromServer?.query == null)
    || (location.path === locationFromServer?.path && location.query === locationFromServer?.query)
  ) {
    /* eslint-disable no-param-reassign */
    preloadedState.router = {
      ...(preloadedState.router ?? {}),
      location: {
        ...(preloadedState.router?.location ?? {}),
        hash: location.fragment,
        search: location.query,
        pathname: location.path,
      },
    };
    /* eslint-enable no-param-reassign */
  }
  return preloadedState;
};

export const selectLocationFromLocationChangeAction = (action: AnyAction) => {
  return convertToLocation(action.payload.location);
};

export const selectFirstRenderingFromLocationChangeAction = (action: AnyAction) => {
  return action.payload.isFirstRendering;
};

interface NavActionDef<P> {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- rest args are not known for this generic type
  actionCreator(...args: any[]): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- varied return array not known for this generic type
  convertArgs(payload: P): any[];
}

const defineNavAction = <P, >({type, actionCreator, convertArgs}: NavActionDef<P>) => {
  const wrapperActionCreator: ActionDefinition<P> = (args: P) => {
    return actionCreator(...convertArgs(args));
  };
  wrapperActionCreator.type = type;
  wrapperActionCreator.toString = () => type;
  return wrapperActionCreator;
};

export const navActions = {
  mediaChange: mediaChangeAction,
  navigate: defineNavAction({
    actionCreator: push,
    convertArgs: ({route}: {route: string}) => {
      return [route];
    },
    type: CALL_HISTORY_METHOD,
  }),
  locationChange: defineNavAction({
    actionCreator: () => {
      throw new Error('This action is created by browser events. Use "navigate" action to programmatically navigate.');
    },
    convertArgs: () => ([]),
    type: LOCATION_CHANGE,
  }),
  serverLocationLoaded: defineAction
    .type('nav.serverLocationLoaded')
    .payload<{location: Location}>(),
  locationChangeApplied: defineAction
    .type('nav.locationChangeApplied')
    .payload<{location: Location}>(),
};

// As much as possible, keep react-router dependencies in this file

let browserHistory: History;

class NavigationProviderComponent extends React.Component<{dispatch: Dispatch}> {
  private mediaQueryContext?: MediaQueryContext;

  public componentDidMount() {
    this.mediaQueryContext = new MediaQueryContext(this.props.dispatch);
    this.mediaQueryContext.addQuery({
      property: 'mobile',
      query: '(max-width: 767px)',
    });
    this.mediaQueryContext.addQuery({
      property: 'portrait',
      query: '(orientation: portrait)',
    });
  }

  public componentWillUnmount() {
    this.mediaQueryContext?.close();
    this.mediaQueryContext = undefined;
  }

  public render() {
    return (
      <ConnectedRouter history={browserHistory}>
        {this.props.children}
      </ConnectedRouter>
    );
  }
}

const NavProvider = connect(
  null,
  (dispatch) => ({dispatch}),
)(NavigationProviderComponent);

export const createNavMiddleware = (
  {locationForSsr, useHashRouter}: {locationForSsr?: string, useHashRouter?: boolean} = {},
) => {
  // SSR strategy from https://github.com/supasate/connected-react-router/issues/39
  if (locationForSsr !== undefined) {
    const staticRouter = new StaticRouter({
      basename: '',
      context: {},
      location: locationForSsr,
    });
    const {props} = staticRouter.render() as ReactElement;
    browserHistory = props.history;
  } else if (browserHistory == null) {
    if (useHashRouter ?? false) {
      browserHistory = createHashHistory();
    } else {
      browserHistory = createBrowserHistory();
    }
  }
  return {
    navMiddleware: routerMiddleware(browserHistory),
    location: convertToLocation(browserHistory.location),
  };
};

// Approximate opaque type via https://stackoverflow.com/a/56749647
declare const tag: unique symbol;
export type NavigationState = {
  readonly [tag]: 'HatchWebNavigationState';
  mediaQueryMatches: {[key: string]: boolean};
};

const selectRouter = (state: NavigationState) => {
  // Keep use of connected-react-router opaque, so we can more easily change navigation libraries
  const {router} = state as unknown as {router: RouterState};
  return router;
};

export const selectLocation = (state: NavigationState) => {
  return selectPath(state) + selectQuery(state) + selectFragment(state);
};

export const selectPath = (state: NavigationState) => {
  return selectRouter(state).location.pathname;
};

export const selectQuery = (state: NavigationState) => {
  return selectRouter(state).location.search;
};

export const selectFragment = (state: NavigationState) => {
  return selectRouter(state).location.hash;
};

export const selectIsMobile = (state: NavigationState) => {
  const {mediaQueryMatches} = state;
  return mediaQueryMatches.mobile;
};

export const selectIsPortrait = (state: NavigationState) => {
  const {mediaQueryMatches} = state;
  return mediaQueryMatches.portrait;
};

export const createNavReducers = () => {
  return {
    // Note: server-side rendering assumes non-mobile
    mediaQueryMatches: (state: {mobile: boolean, portrait: boolean}, action: AnyAction) => {
      const mediaState = state ?? {mobile: false, portrait: false};
      if (isActionType(navActions.mediaChange, action)) {
        return {...mediaState, ...action.payload.mediaQueryMatches};
      }
      return mediaState;
    },
    // Keep use of connected-react-router opaque, so we can more easily change navigation libraries
    router: connectRouter(browserHistory) as unknown as Reducer<NavigationState, Action>,
  };
};

export default NavProvider;
