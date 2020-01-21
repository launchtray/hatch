# HATCH_CLI_TEMPLATE_VAR_projectName
This project is a TypeScript [single-page web application](https://en.wikipedia.org/wiki/Single-page_application) built 
using the [hatch](https://github.com/@launchtray/hatch) tools and libraries.

## Key hatch dependencies
The following are key hatch libraries used by this project:
* [hatch-web-server](https://github.com/launchtray/hatch/tree/master/libraries/hatch-web-server) -- for composing the 
  web server application
* [hatch-web-client](https://github.com/launchtray/hatch/tree/master/libraries/hatch-web-client) -- for composing the 
  web client application
* [hatch-web](https://github.com/launchtray/hatch/tree/master/libraries/hatch-web) -- for utilties for building a 
  portable UI
* [hatch-util](https://github.com/launchtray/hatch/tree/master/libraries/hatch-util) -- for dependency injection and 
  logging
* [hatch-server-middleware](https://github.com/launchtray/hatch/tree/master/libraries/hatch-server-middleware) -- for 
  common, app-agnostic server middleware components
* [hatch-test](https://github.com/launchtray/hatch/tree/master/libraries/hatch-test) -- for testing tools, including a 
  Selenium WebDriver wrapper

## Technology stack
This project is directly dependent on the following technologies, as they are peer dependencies of the hatch libraries 
above:
* [Razzle](https://github.com/jaredpalmer/razzle) -- for server-side rendering, hot reloading setup, and so much more
* [express](https://expressjs.com) -- for server-side routing and request handling
* The following client-side UI libraries: 
  * [React](https://reactjs.org), 
  * [Redux](https://redux.js.org), 
  * [Redux-Saga](https://redux-saga.js.org), 
  * [React Native for Web](http://necolas.github.io/react-native-web), and
  * [React Router](https://reacttraining.com/react-router)
* [winston](https://github.com/winstonjs/winston) -- for logging, server-side
* [Sentry](https://sentry.io) -- for error reporting

## Key modules and patterns
The following subsections describe the key types of components and architectural patterns used in this project.

### server.ts
This is the entry point for the web server process. This file will likely never need to be changed. To change the
composition of the web server, instead edit the [composeServer.ts](#composeServerTs) module.

### client.ts
This is the entry point for the web client running in the browser. This file will likely never need to be changed. 
To change the composition of the client, instead edit the [composeClient.ts](#composeClientTs) module.

### composeCommon.ts
This module is responsible for registering modules used by both the client and server with the dependency injection
container, so that they can be found by other classes as they are instantiated and called. The ROOT_CONTAINER export  
from the `hatch-util` library should be used for this registration. 

The default export of this file is responsible for returning an object implementing the `WebCommonComposition` interface
from `hatch-web`. Conceptually, `WebCommonComposition` represents the entry points for the web UI, including the root 
component, and the [web app manager classes](#Managers) that manage the UI state. Note that the UI needs to be defined 
here, rather than in [composeClient.ts](#composeClientTs) in order to support server-side rendering.

### composeServer.ts
This module is responsible for registering modules used by just the web server with the dependency injection container
container, so that they can be found by other classes as they are instantiated and called. The ROOT_CONTAINER export
from the `hatch-util` library should be used for this registration. 

The default export of this file is responsible for returning an object implementing the `WebServerComposition` interface
from `hatch-web-server`. Conceptually, `WebServerComposition` represents the entry points for HTTP API routes, in the 
form of the [controller](#Controllers) objects that manage those routes. Note that the web app UI routes are not managed
by these controllers, as they are instead defined via the structure of React components making use of 
[React Router](https://reacttraining.com/react-router), and by UI state logic managed by 
[web app manager classes](#Managers).

### composeClient.ts
This module is responsible for registering modules used by just the web client with the dependency injection container
container, so that they can be found by other classes as they are instantiated and called. The ROOT_CONTAINER export
from the `hatch-util` library should be used for this registration. 

The default export of this file is responsible for returning an object implementing the `WebClientComposition` interface
from `hatch-web-server`. Conceptually, `WebClientComposition` represents entry points for the client application which
are not already coverd by `WebCommonComposition`.

### Controllers
Controllers are define HTTP routes that the server handles. Controller classes are registered by the 
[composeServer.ts](#composeServerTs) module, and must be annotated with the `@controller` annotation exported by
`hatch-server`. Within a Controller, routes are defined using decorators within the `route`
namespace exported by `hatch-server`. These decorators use the same routing syntax that is used by
[express](https://expressjs.com), including support for route parameters. A simple example of a GET route with a person
ID parameter can be seen below:

```typescript
import {
  BasicRouteParams,
  controller,
  route,
  ServerMiddleware,
} from '@launchtray/hatch-server';
import {inject, Logger} from '@launchtray/hatch-util';

@controller()
export default class ExampleController implements ServerMiddleware {
  // Note: dependencies can be injected into the constructor
  constructor(@inject('Logger') private readonly logger: Logger) {
  }

  @route.get('/api/person/:id')
  public personEndpoint(params: BasicRouteParams) {
    params.res.status(200).send('Person: ' + params.req.params.id);
  }

  ...
```

As shown above, route methods can take in a parameter of type `BasicRouteParams`, which contains the Express 
[Request](https://expressjs.com/en/api.html#req) and [Response](https://expressjs.com/en/api.html#res) objects, the 
`next` callback passed to the request handler, as well as a Logger instance.

However, when a request comes in, the server creates a new dependency injection container specifically for that request.
This container is a child of the root container that is used by [composeServer.ts](#composeServerTs) and 
[composeCommon.ts](#composeCommonTs) to register dependency classes. The only object that gets registered into the child
container that is not also in the root container is a `BasicRouteParams` instance. The parameters of the route handler
methods are actually auto-resolved using this container. This means that not only could we define the method with a
single BasicRouteParams parameter, but we could also use any parameters, as long as they can be resolved by the child
container described above. For example, imagine a very simple `HTTPResponder` class which depends on `BasicRouteParams`:
```typescript
import {BasicRouteParams} from '@launchtray/hatch-server';
import {containerSingleton} from '@launchtray/hatch-util';

@containerSingleton()
export default class HTTPResponder {
  constructor(public readonly params: BasicRouteParams) {}

  public ok(body?: any) {
    this.params.res.status(200).send(body);
  }
}
```
Since this class is annotated as injectable (via `@containerSingleton()`), and since it only depends on things that are
registered in an HTTP request's child container (in this case, just `BasicRouteParams`), we can use it as a parameter to
a route like so:

```typescript
@route.get('/api/example')
public exampleEndpoint(responder: HTTPResponder) {
  this.logger.info('Example endpoint called');
  responder.ok('Example GET');
}
```

### Components
Components are presentational React Components that are concerned with "how things look" and are not directly 
connected to the Redux store. 

If you're adding something that represents a "widget," it is likely a Component. 

In general, prefer Components which are stateless and are simply a pure function of their props.

### Containers
Containers are React Components that are concerned with "how the UI relates to logic in [managers](#Managers)." These
are usually connected to the [Redux](https://redux.js.org) store using [React Redux](https://react-redux.js.org), and
often also involve [React Router](https://reacttraining.com/react-router) components.

If you're adding something that represents a "page" or "screen," it's likely a Container.

Whenever you can, prefer using [Components](#Components) that are ignorant of Redux and React Router over Containers.

### Managers
Web App Managers (or "Managers" for short, in the context of this project) tie the UI to business logic defined via
[Service](#Services) modules. Managers do this by defining two types of methods: 
[location change handlers](#location-change-handlers) and [client load handlers](#client-load-handlers). Either of these
methods types can be defined as `async` methods, or [as Sagas](#manager-methods-as-sagas).

#### Location change handlers
Methods decorated with `@onLocationChange()`, which run whenever a UI route is loaded. These methods run both on the
server and on the client. The server runs them during server-side rendering for the route that has been requested
by the browser. The client runs them for all client-side navigation events after the initial rendering by the server.

The decorator applied to these methods can optionally constrain which routes will cause the method to run, by passing
in either a string representing a path, or an object which conforms to
[React Router's Route Props](https://github.com/ReactTraining/react-router/blob/master/packages/react-router/docs/api/Route.md#route-props)
type. Note only the following are fields of this interface are really relevant to this use case: 
* [`path`](https://github.com/ReactTraining/react-router/blob/master/packages/react-router/docs/api/Route.md#path-string--string)
* [`exact`](https://github.com/ReactTraining/react-router/blob/master/packages/react-router/docs/api/Route.md#exact-bool)
* [`sensitive`](https://github.com/ReactTraining/react-router/blob/master/packages/react-router/docs/api/Route.md#sensitive-bool)
* [`strict`](https://github.com/ReactTraining/react-router/blob/master/packages/react-router/docs/api/Route.md#strict-bool)

As an example, here's a method that is only called when the `/hi` route is loaded:

```typescript
@onLocationChange({path: '/hi'})
public async prepGreeting() {
  this.logger.info('Hello, world!');
}
```
Note that this could also just use the string '/hi' as a parameter:
```typescript
@onLocationChange('/hi')
public async prepGreeting() {
  this.logger.info('Hello, world!');
}
```
Routes paths can also contain route parameters, e.g. extracting a user ID from the route:
```typescript
@onLocationChange('/user/:id')
public async prepRoute(context: LocationChangeContext<{id: string}>) {
  this.logger.info('Loaded user: ' + context.pathMatch.params.id);
}
```

As shown above, these methods can take in a `LocationChangeContext` object, which contains information about the 
route change that has been applied.

However, making use of dependency injection, these methods can also take in any class registered in the dependency 
injection container. The container used to resolve the dependency will be injected with a single instance of
`LocationChangeContext`, meaning complex objects depending on this object can be constructed.

For example, imagine we had a class `UserContext` which only needs an ID to be constructed:
```typescript
@injectable
class UserContext {
  public id: string;

  constructor(locationChangeContext: LocationChangeContext) {
    this.id = context.pathMatch.params.id;
  }
}
```

Our user ID location change handler above could simply be written as this:

```typescript
@onLocationChange('/user/:id')
public async prepRoute(context: UserContext) {
  this.logger.info('Loaded user: ' + context.id);
}
```
As you might imagine, much more complex object trees could potentially be derived from a container injected with a
`LocationChangeContext` object.

#### Client load handlers
Methods decorated with `@onClientLoad()`, which run when the client loads. Common use cases for these are for setting
up long-running effects (e.g. refresh timers, or `takeEvery` saga effects).

The root parameter type for these methods is `ClientLoadContext`. However, like with `@onLocationChange` methods, 
these methods can build up more complex parameter types, making use of dependency injection. The container used to
resolve the dependency will be injected with a single instance of `ClientLoadContext`.

#### Manager methods as Sagas
All of the examples above show `async` methods. For simple use cases, this might be sufficient. However, for more 
complex cases, these methods can also be generators which yield 
[Redux Saga Effects](https://redux-saga.js.org/docs/basics/DeclarativeEffects.html). For example:
   ```typescript
   @onLocationChange({path: '/hi'})
   public *prepGreeting() {
     yield put(actions.showGreeting());
   }
   ```

   ```typescript
   @onClientLoad()
   public *registerButtonHandler() {
     yield takeLatest(actions.buttonClick, this.handleButtonClick.bind(this));
   }
   ```

### Actions
Actions are simply [Redux actions](https://redux.js.org/basics/actions). For the best developer experience, actions 
should be defined in a top-level `actions` object using the `defineAction` module in `hatch-web`. As an example:

```typescript
import {defineAction} from '@launchtray/hatch-web';

const actions = {
  exampleAction: defineAction
    .type('exampleAction')
    .payload<{
      stringField: string,
      optionalStringField?: string,
    }>(),
  exampleAction2: defineAction
    .type('exampleAction2')
    .payload<{
      numberField: number,
    }>(),
};

export default actions;
```
The syntax is admittedly a little weird (don't miss the trailing `()`), but ensures type safety.

### Reducers
Reducers are simply [Redux reducers](https://redux.js.org/basics/reducers). For the best developer experience, reducers
should be defined using the `defineReducer` module in `hatch-web`. As an example:

```typescript
import {defineReducer} from '@launchtray/hatch-web';
import actions from '../actions/index';

export default defineReducer({
  numberState: 97,
  stringState: '',
})
  .on(actions.exampleAction, (state, payload) => {
    return {
      ...state,
      stringState: payload.stringField,
    };
  })
  .on(actions.exampleAction2, (state, payload) => ({
    ...state,
    numberState: payload.numberField,
  }));
```

Using this module adds type safety.

### Services
### Utilities

## Developer setup
1. First, ensure all dependencies are installed using your package manager, e.g. for npm:

    ```
    npm install
    ```
1. To run in development mode with hot reloading, run the `start` script with your package manager, e.g. for npm:

    ```
    npm start
    ```
    You can view your webpp at http://localhost:3000, unless a different port was selected via the PORT environment 
    variable, e.g. via:

    ```
    PORT=80 npm start
    ```
    If you'd like to restart the server while it's running, simply type `rs`
1. To build the app for production, run the `build` script, e.g. with npm:

    ```
    npm build
    ```
1. To run the production-built app, run the `start:prod` script, e.g. with npm:

    ```
    npm start:prod
    ```
1. To run tests, run the Jest test watcher via the `test` script, e.g. with npm:

    ```
    npm test
    ```