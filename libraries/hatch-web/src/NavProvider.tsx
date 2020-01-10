import {
  CALL_HISTORY_METHOD,
  ConnectedRouter,
  connectRouter,
  LOCATION_CHANGE,
  push,
  routerMiddleware,
  RouterState,
} from 'connected-react-router';
import {createBrowserHistory, History, Location as HistoryLocation} from 'history';
import React, {ReactElement} from 'react';
import {connect} from 'react-redux';
import {StaticRouter} from 'react-router-dom';
import {AnyAction, Dispatch} from 'redux';
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

interface NavActionDef<P> {
  type: string;
  actionCreator(...args: any[]): any;
  convertArgs(payload: P): any[];
}

const defineNavAction = <P extends unknown>({type, actionCreator, convertArgs}: NavActionDef<P>) => {
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
  (dispatch) => ({dispatch})
)(NavigationProviderComponent);

export const createNavMiddleware = (locationForServerSideRendering?: string) => {
  // SSR strategy from https://github.com/supasate/connected-react-router/issues/39
  if (locationForServerSideRendering !== undefined) {
    const staticRouter = new StaticRouter({
      basename: '',
      context: {},
      location: locationForServerSideRendering,
    });
    const {props} = staticRouter.render() as ReactElement;
    browserHistory = props.history;
  } else if (browserHistory == null) {
    browserHistory = createBrowserHistory();
  }
  return {
    navMiddleware: routerMiddleware(browserHistory),
    location: convertToLocation(browserHistory.location),
  };
};

export const selectLocation = (state: any) => {
  return selectPath(state) + selectQuery(state) + selectFragment(state);
};

export const selectPath = (state: any) => {
  const {router}: {router: RouterState} = state;
  return router.location.pathname;
};

export const selectQuery = (state: any) => {
  const {router}: {router: RouterState} = state;
  return router.location.search;
};

export const selectFragment = (state: any) => {
  const {router}: {router: RouterState} = state;
  return router.location.hash;
};

export const selectIsMobile = (state: any) => {
  const {mediaQueryMatches}: {mediaQueryMatches: {[key: string]: boolean}} = state;
  return mediaQueryMatches.mobile;
};

export const selectIsPortrait = (state: any) => {
  const {mediaQueryMatches}: {mediaQueryMatches: {[key: string]: boolean}} = state;
  return mediaQueryMatches.portrait;
};

export const createNavReducers = () => {
  return {
    // Note: server-side rendering assumes non-mobile
    mediaQueryMatches: (state = {mobile: false, portrait: false}, action: AnyAction) => {
      if (isActionType(navActions.mediaChange, action)) {
        return {...state, ...action.payload.mediaQueryMatches};
      }
      return state;
    },
    router: connectRouter(browserHistory),
  };
};

export default NavProvider;
