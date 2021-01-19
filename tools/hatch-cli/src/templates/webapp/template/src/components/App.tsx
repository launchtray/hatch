import React from 'react';
import {Helmet} from 'react-helmet-async';
import {Text} from 'react-native';
import {Route, Switch} from 'react-router';

const App = () => (
  <Switch>
    <Route exact={true} path={'/'}>
      <Helmet>
        <title>
          {'Home'}
        </title>
      </Helmet>
      <Text>
        {'Hello, world!'}
      </Text>
    </Route>
  </Switch>
);

export default App;
