# Controllers
Controllers can be generated by running `hatch controller <ModuleName>`

Controllers define HTTP routes that the server handles. Controller classes are registered by the 
[composeServer.ts](../../README.md#composeserverts) module, and must be annotated with the `@controller` annotation 
exported by `hatch-server`. 

## Routes
Within a Controller, routes are defined using decorators within the `route` namespace exported by `hatch-server`. These 
decorators use the same routing syntax that is used by [express](https://expressjs.com), including support for route 
parameters. A simple example of a GET route with a person ID parameter can be seen below:

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
`next` callback passed to the request handler, a Logger instance, any cookies, and the auth header.

However, when a request comes in, the server creates a new dependency injection container specifically for that request.
This container is a child of the root container that is used by [composeServer.ts](../../README.md#composeserverts) and
[composeCommon.ts](../../README.md#composecommonts) to register dependency classes. The only objects that get registered
into the child container that are not also in the root container are the fields of `BasicRouteParams`. The parameters of
route handler methods are actually auto-resolved using this container. This means that not only could we define the 
method with a single `BasicRouteParams` parameter, but we could also use any parameters, as long as they can be resolved 
by the child container described above. For example, imagine a very simple `HTTPResponder` class which depends on 
`BasicRouteParams`:

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

### WebSockets
In addition to HTTP method routes, WebSocket server routes can be defined. These routes make use of the 
[ws library](https://github.com/websockets/ws). An example WebSocket route that broadcasts messages to all other clients
is shown below. Note that route parameters (in this case an ID) can also be used with WebSocket routes.

```typescript
@route.websocket('/ws/:id')
public async handleWebsocket(params: WebSocketRouteParams) {
  const ws = params.webSocket; 

  // ws is simply a web socket object from the ws library

  ws.on('message', (msg: string) => {
    params.webSocketServer.clients.forEach((client: WebSocket) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(params.req.params.id + ': ' + msg);
      }
    });
  });
}
```