# hatch-scim2-server-sdk
This project is a TypeScript server sdk project that contains autogenerated code based on an 
[OpenAPI Specification](https://swagger.io/specification/). In many cases, the input specification
is defined by an API project in the same repository, which feeds both server and client SDK generators.

## Code generation process
A server SDK is typically generated from an OpenAPI specification, which is in turn generated or defined
by an API project within the same repository. The OpenAPI specification often also serves as an input to the
generation of a client SDK library, which can be used by clients of the service to interact with the API in a
type-safe way.

## API delegates
API delegates provide handlers for incoming HTTP requests. This library includes auto-generated TypeScript
interfaces that define the API delegates that must be implemented to provide the HTTP-based API defined by the input
OpenAPI specification.

Auto-generated code within this project calls API delegate methods with parsed, typed parameters in order to 
service HTTP requests. API delegates should be registered as middleware for a server using the `getApiMiddleware` 
export of this library. For example, in composeServer.ts for a server (assuming an API called ExampleApi):
```typescript

export default async (): Promise<WebServerComposition> => {
  /* ... */
  return {
    ...commonComposition,
    serverMiddleware: [
      JSONBodyParser,
      RequestLogger,
      ...getApiMiddleware({
        delegateForExampleApi: ExampleApiDelegateImpl,
      }),
      RouteNotFound, // Catch-all 404 for unimplemented APIs
    ],
  };
};
```

### Delegate methods
The interfaces required by the parameters to `getApiMiddleware` include handler methods for each HTTP endpoint
defined in the API spec. Each of these methods has an explicitly typed `request` object as its first parameter,
which includes all request parameters and payloads, parsed into a type-safe object. Optionally, the class
implementing the API delegate can define other parameters to be injected, as long as the types of the parameters
can be resolved via dependency injection for the current request context. For example, even though the API delegate
interface has a handler method defined as follows:
```typescript
handleCreateTester(
  request: models.CreateTesterRequest & {isLocal: boolean, isFromSsr: boolean},
  ...optionalInjections: unknown[]
): ApiDelegateResponse<models.CreateTesterResponse>;
```
The implementing class might implement it as such, to get a per-request logger and low-level information about the
underlying HTTP request:
```typescript
handleCreateTester(
  request: CreateTesterRequest,
  @inject('Logger') logger: Logger,
  basicRouteParams: BasicRouteParams,
): CreateTesterResponse {
  /* ... */
}
```
This uses the same mechanism as parameters to routes defined manually. For more information, see the 
[Manual routes](#manual-routes) section below.

### Alternate Actions and API Errors
In some cases, it might not make sense to return the expected response object, e.g. in the case of an
error condition. In those cases, API delegate methods can either return an `ApiAlternateAction` object,
or throw an `ApiError` to indicate the HTTP status code to use, headers to return, and the contents of 
the response body. For example, the two non-successful cases result in the same HTTP response:
```typescript
import {
  ApiAlternateAction,
} from '@launchtray/hatch-util';

handleCreateTester(
  request: CreateTesterRequest,
  @inject('Logger') logger: Logger,
  basicRouteParams: BasicRouteParams,
): CreateTesterResponse {
  return new ApiAlternateAction(500, 'Test error');
}
```
```typescript
import {
  ApiAlternateAction,
  ApiError,
} from '@launchtray/hatch-util';

handleCreateTester(
  request: CreateTesterRequest,
  @inject('Logger') logger: Logger,
  basicRouteParams: BasicRouteParams,
): CreateTesterResponse {
  throw new ApiError(new ApiAlternateAction(500, 'Test error'), 'Detailed error message');
}
```
This mechanism works for explicit API controller handlers as well as for manually-defined routes.

### Manual routes
In most cases, the autogenerated code is all that is necessary for building APIs. However, in some cases, it is
necessary to define routes manually, e.g. for wildcard routes that do common processing before other endpoints.

Routes can be defined manually using decorators within the `route` namespace exported by `hatch-server`. These
decorators use the same routing syntax that is used by [express](https://expressjs.com), including support for route
parameters. A simple example of a GET route with a person ID parameter can be seen below:

```typescript
import {
  BasicRouteParams,
  route,
} from '@launchtray/hatch-server';
import {inject, containerSingleton, Logger} from '@launchtray/hatch-util';

@containerSingleton()
export default class ExampleApiDelegateImpl {
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

## Health checks
Each controller can define health checks that contribute to the overall health result returned by `/api/health`,
`/api/health/liveness` and `/api/health/readiness`. This can be done via `@livenessCheck()` and `@readinessCheck()`
decorators. Each controller can have multiple checks of each type.

### Liveness checks
Liveness checks can be used for signaling that the service is alive or if it needs to be restarted.

To signal that functionality is healthy, methods decorated with `@livenessCheck()` can return `true` or
`LivenessState.CORRECT`. Liveness checks that throw an error, return `false` or return `LivenessState.BROKEN` will cause
the overall health check to indicate that the service is down.

### Readiness checks
Readiness checks can be used for signaling that the service is not only alive, but is ready to receive traffic.

To signal that functionality is ready, methods decorated with `@readinessCheck()` can return `true` or
`ReadinessCheck.ACCEPTING_TRAFFIC`. Readiness checks that throw an error, return `false` or return
`ReadinessCheck.REFUSING_TRAFFIC` will cause the overall health check to indicate that the service is out of service.

### Application info
By default, `/api/health/info` will respond with basic information about the build, like commit ID, package name and
version, build time, etc. Custom data can be returned by this endpoint by adding controller methods decorated with
`@appInfoProvider()`. These methods can be asynchronous and should return an object representing key-value pairs to be
included in the response for `/api/health/info`.
