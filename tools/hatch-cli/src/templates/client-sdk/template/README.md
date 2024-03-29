# HATCH_CLI_TEMPLATE_VAR_projectShortName
This project is a TypeScript client sdk project that contains autogenerated code based on an 
[OpenAPI Specification](https://swagger.io/specification/).

## Code generation process
A client SDK is typically generated from an OpenAPI specification, which is in turn generated or defined
by an API project within the same repository. The OpenAPI specification often also serves as an input to the
generation of a server SDK library, which can be used to help define the middleware necessary to provide the API.

## API interfaces
This library defines TypeScript interfaces for each API that it provides an HTTP client implementation for.
For servers who are both clients and servers of an API (e.g. for webapps providing server-side rendering), a
"Local" version of the client SDK is also provided, which forwards client cookies and makes requests to localhost.

### Registration
To register a client SDK for a remote server (e.g. in browser client code), use the `registerRemoteApis` method
provided by this library. e.g. in composeClient.ts:
```typescript
import {
  registerRemoteApis,
} from 'HATCH_CLI_TEMPLATE_VAR_projectName';
import {ROOT_CONTAINER} from '@launchtray/hatch-util';

export default async (): Promise<WebClientComposition> => {
  /* ... */
  registerRemoteApis(ROOT_CONTAINER);
  /* ... */
};
```
To register a client SDK for the API server to itself use server-side (e.g. for server-side rendering), use the 
`registerLocalApis` method provided by this library. e.g. in composeServer.ts:
```typescript
import {
  registerLocalApis,
} from 'HATCH_CLI_TEMPLATE_VAR_projectName';
import {ROOT_CONTAINER} from '@launchtray/hatch-util';

export default async (): Promise<WebServerComposition> => {
  /* ... */
  registerLocalApis(ROOT_CONTAINER);
  /* ... */
};
```

## Use
To use the client SDK (e.g. in web app managers), add them as injected parameters using the tokens provided
by this library. For example (assuming the existence of ExampleApi):
```
import {
  ExampleApi,
  ExampleApiInjectionToken,
} from 'HATCH_CLI_TEMPLATE_VAR_projectName';

/* ... */

@webAppManager()
export default class ExampleManager {
  constructor(
    private dependency: ExampleDependencyForManager,
    @inject(ExampleApiInjectionToken) private exampleApi: ExampleApi,
    @inject('Logger') private logger: Logger,
  ) {}
  
  /* ... */
  
  *someManagerMethod() {
    const responseValue = await exampleApi.getExampleValue();
  }
}
```

### Example Usage
Each HTTP endpoint has two associated member methods. One that only returns the response body object, and one "raw" 
method which returns more detail about response headers, status codes, etc. 

```
const exampleApi = new ExampleApi();
const responseValue = await exampleApi.getExampleValue();
const responseRawValue = await exampleApi.getExampleValueRaw();

```
For specific methods provided by this library, refer to the types defined in the src/autogen/apis directory.

The client sdk can be instantiated with an optional configuration object:

```
import {
  Configuration, 
  ConfigurationParameters, 
  ExampleApi,
} from 'HATCH_CLI_TEMPLATE_VAR_projectName';

const configurationParameters: ConfigurationParameters = {
  basePath: 'http://localhost:3000',
  accessKey: accessKey || getAccessKey,
};

const configuration = new Configuration(configurationParameters);
const exampleApi = new ExampleApi(configuration);
const responseValue = await exampleApi.getExampleValue();

```
See the `ConfigurationParameters` interface in the [runtime.ts](src/autogen/runtime.ts) file for more information.