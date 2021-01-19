import {Link} from '@launchtray/hatch-web';
import React from 'react';
import {Helmet} from 'react-helmet-async';
import {Route, Switch} from 'react-router';
import Home from '../containers/Home';

const App = (): React.ReactElement => (
  <Switch>
    <Route exact={true} path={'/'}>
      <Helmet>
        <title>{'Home title'}</title>
      </Helmet>
      <Home/>
    </Route>
    <Route exact={true} path={'/hello'}>
      <Helmet>
        <title>{'Hello'}</title>
      </Helmet>
      <Link to={'/'} testID={'homeLink'}>
        {'Go home'}
      </Link>
    </Route>
  </Switch>
);

export default App;
