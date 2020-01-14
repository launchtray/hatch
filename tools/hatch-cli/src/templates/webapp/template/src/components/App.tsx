import {Link} from '@launchtray/hatch-web';
import React from 'react';
import {Helmet} from 'react-helmet-async';
import {Route, Switch} from 'react-router';
import {Text} from 'react-native';

const App = () => (
  <Switch>
    <Route exact={true} path='/'>
      <Helmet>
        <title>Home</title>
      </Helmet>
      <Text>Hello, world!</Text>
    </Route>
  </Switch>
);

export default App;
