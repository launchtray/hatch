import {MockServer, MockServerClient} from '../index';

describe('Simple Mock', () => {
  let mockServer: MockServer;
  let mockClient: MockServerClient;

  beforeAll(async () => {
    mockServer = new MockServer(3000);
    mockClient = new MockServerClient({port: 3000});
    await mockServer.start();
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  beforeEach(async () => {
    await mockClient.reset();
  });

  test('returns recorded requests', async () => {
    const testBody = Buffer.from('010203', 'hex');
    await mockClient.mockSimpleResponse({
      method: 'POST',
      path: '/hello',
      statusCode: 422,
      requestBody: testBody,
      responseBody: Buffer.from('040506', 'hex'),
    });

    let response = await fetch('http://localhost:3000/hello?msg=world&msg=world2', {
      method: 'POST',
      // eslint-disable-next-line @typescript-eslint/naming-convention, quote-props -- explicit header name
      headers: {'Content-Type': 'application/binary', 'Cookie': 'abc=123; xyz=789;'},
      body: testBody,
    });

    expect(response.status).toEqual(422);
    let responseBuffer = Buffer.from(await response.arrayBuffer());
    expect(responseBuffer).toEqual(Buffer.from('040506', 'hex'));

    const requestFilter = {
      method: 'POST',
      // eslint-disable-next-line @typescript-eslint/naming-convention, quote-props -- explicit header name
      requestHeaders: {'Content-Type': ['application/binary']},
      requestCookies: {abc: '123', xyz: '789'},
      body: testBody,
    };

    let requests = await mockClient.getRecordedRequests(requestFilter);
    expect(requests.length).toEqual(1);
    expect(requests[0].body).toEqual(Buffer.from('010203', 'hex'));

    response = await fetch('http://localhost:3000/hello?msg=world&msg=world2', {
      method: 'POST',
      // eslint-disable-next-line @typescript-eslint/naming-convention, quote-props -- explicit header name
      headers: {'Content-Type': 'application/binary', 'Cookie': 'abc=123; xyz=789;'},
      body: Buffer.from('010203', 'hex'),
    });
    expect(response.status).toEqual(422);
    responseBuffer = Buffer.from(await response.arrayBuffer());
    expect(responseBuffer).toEqual(Buffer.from('040506', 'hex'));

    requests = await mockClient.getRecordedRequests(requestFilter);
    expect(requests.length).toEqual(2);

    await mockClient.clearRequests();

    requests = await mockClient.getRecordedRequests(requestFilter);
    expect(requests.length).toEqual(0);
  });
});
