# hatch-mock-server
This project is a TypeScript library which provides a mock server for testing.

## Usage
The mock server can be started via the `mock-server` command, e.g. within a script defined in package.json.
To set the port that is used, set the PORT environment variable, e.g.:
```
    "start:service-mock": "PORT=8080 mock-server",
```
Interacting with the mock server (e.g. within a test) is done via the `MockServerClient` class:
```typescript
  const mockClient = new MockServerClient({
    host: 'localhost',
    port: 8080,
  });

  ...

  // Refer to SimpleMockResponseOptions for the full list of options
  await mockClient.mockSimpleResponse({
    path: '/api/my-api',
    method: 'GET',
    statusCode: 200,
    queryParams: {'id': '123'},
    responseBody: 'Hello, world!',
  });
```