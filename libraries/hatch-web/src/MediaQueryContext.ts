import {Dispatch} from 'redux';
import defineAction from './defineAction';

type MediaChangeEventListener = ({matches}: {matches: boolean}) => void;

interface MediaQuery {
  mediaQueryList: MediaQueryList;
  listener: MediaChangeEventListener;
}

export const mediaChangeAction = defineAction
  .type('nav.mediaChange')
  .payload<{
    mediaQueryMatches: {[key: string]: boolean},
  }>();

export default class MediaQueryContext {
  private queries: MediaQuery[];

  constructor(private readonly dispatch: Dispatch) {
    this.dispatch = dispatch;
    this.queries = [];
  }

  public addQuery({property, query}: {property: string, query: string}) {
    const listener: MediaChangeEventListener = ({matches}) => {
      this.dispatch(mediaChangeAction({
        mediaQueryMatches: {
          [property]: matches,
        },
      }));
    };
    // eslint-disable-next-line no-undef -- global window object
    const mediaQueryList = window.matchMedia(query);
    mediaQueryList.addListener(listener);
    listener(mediaQueryList);
    this.queries.push({mediaQueryList, listener});
  }

  public close() {
    for (const {mediaQueryList, listener} of this.queries) {
      mediaQueryList.removeListener(listener);
    }
    this.queries = [];
  }
}
