import {Readable} from 'stream';
import {
  addMetadata,
  ApiAlternateAction,
  ApiDelegateResponse,
  containerSingleton,
  inject,
  Logger,
  PREVENT_DEFAULT_RESPONSE,
  StreamUtils,
} from '@launchtray/hatch-util';
import {
  ApiExampleEnumListIdGetHttpRequest,
  ApiExampleEnumListIdGetHttpResponse,
  CreateUserHttpRequest,
  CreateUserHttpResponse,
  CreateUserResponsePayloadRoleEnum,
  GetLatestMetricsHttpRequest,
  GetLatestMetricsHttpResponse,
  GetMetricsCountHttpRequest,
  GetMetricsCountHttpResponse,
  GetReportPdfHttpRequest,
  GetReportPdfHttpResponse,
  GetStatusHttpRequest,
  GetStatusHttpResponse,
  GetUserHttpRequest,
  GetUserHttpResponse,
  MakeAdminHttpRequest,
  Metric,
  MetricsApiDelegate,
  ReportApiDelegate,
  SaveMetricsHttpRequest,
  SaveMetricsHttpResponse,
  UsersApiDelegate,
} from '@launchtray/example-server-sdk';
import {BasicRouteParams, WebSocketRouteParams} from '@launchtray/hatch-server-middleware';
import {CreateTesterHttpRequest} from '@launchtray/example-client-sdk';
import {appInfoProvider, route} from '@launchtray/hatch-server';
import WebSocket from 'ws';

@containerSingleton()
export default class UsersApiDelegateImpl implements UsersApiDelegate, MetricsApiDelegate, ReportApiDelegate {
  constructor(@inject('Logger') private logger: Logger) {
    logger.info('Constructing UsersApiControllerDelegateImpl');
  }

  handleApiExampleEnumListIdGet(
    request: ApiExampleEnumListIdGetHttpRequest,
  ): ApiExampleEnumListIdGetHttpResponse {
    const results: string[] = request.queryParams?.itemTypes ?? [];
    return {
      status: 200,
      body: {
        results,
      },
    };
  }

  handleGetStatus(
    request: GetStatusHttpRequest,
  ): GetStatusHttpResponse {
    return {
      body: `${request?.queryParams?.type ?? 'ALL'}: OK`,
    };
  }

  @route.get('*')
  wildcard(params: BasicRouteParams) {
    this.logger.info(`ONE: ${params.req.url}`);
    params.next();
  }

  @route.get('*')
  wildcard2(params: BasicRouteParams) {
    this.logger.info(`TWO: ${params.req.url}`);
    params.next();
  }

  @route.get('*')
  wildcard3(params: BasicRouteParams) {
    this.logger.info(`THREE: ${params.req.url}`);
    params.next();
  }

  @route.get('/api/users/error')
  errorExample() {
    return new ApiAlternateAction(500, 'Test error');
  }

  @appInfoProvider()
  testing123() {
    return {hi: 'there'};
  }

  @route.websocket('/api/user-ws/:id')
  public async handleWebsocket(params: WebSocketRouteParams) {
    this.logger.debug(`handleUserWebsocket: ${params.req.url}`);
    const ws = params.webSocket;
    ws.on('message', (msg: string) => {
      this.logger.debug(`received message: ${msg}`);
      params.webSocketServer.clients.forEach((client: WebSocket) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(`${params.req.params.id}: ${msg}`);
        }
      });
    });
  }

  handleGetReportPdf(
    request: GetReportPdfHttpRequest & {isFromSsr: boolean},
  ): GetReportPdfHttpResponse | ApiAlternateAction {
    this.logger.debug(`handleGetReportPdf: ${JSON.stringify(request)}`);
    const readable = new Readable();
    // eslint-disable-next-line no-underscore-dangle
    readable._read = () => {
      // Do nothing, rely on pushes below
    };
    setTimeout(() => {
      readable.push(request.isFromSsr ? '789' : '123');
      readable.push(null);
    }, 100); // Introduce artificial delay to test out streaming
    if (request.queryParams.timestamp != null) {
      readable.push('TestingXYZ');
      return new ApiAlternateAction(300, Readable.toWeb(readable), {'Content-Type': 'text-plain'});
    }
    readable.push('TestingABC');
    return {
      headers: {
        xStartDate: request.queryParams.startDate.getTime(),
      },
      body: StreamUtils.convertNodeReadableToWebStream(readable),
    };
  }

  handleGetLatestMetrics(request: GetLatestMetricsHttpRequest): GetLatestMetricsHttpResponse {
    this.logger.debug(`handleGetLatestMetrics: ${JSON.stringify(request)}`);
    const body: {[key: string]: Metric} = {};
    for (const metricType of request.body) {
      body[metricType] = {timestamp: 0, txId: 'abc'};
    }
    return {
      body,
    };
  }

  handleGetMetricsCount(request: GetMetricsCountHttpRequest): GetMetricsCountHttpResponse {
    this.logger.debug(`handleGetMetricsCount: ${JSON.stringify(request)}`);
    return {
      body: [1, 2, 3],
    };
  }

  handleSaveMetrics(request: SaveMetricsHttpRequest): ApiDelegateResponse<SaveMetricsHttpResponse> {
    this.logger.debug(`handleSaveMetrics: ${JSON.stringify(request)}`);
    throw new Error('Method not implemented.');
  }

  handleCreateTester(
    request: CreateTesterHttpRequest,
    @inject('Logger') logger: Logger,
  ) {
    logger.debug(`handleCreateTester: ${JSON.stringify(request)}`);
    return new ApiAlternateAction(404, 'No testers found');
  }

  handleCreateUser(
    request: CreateUserHttpRequest,
    @inject('Logger') logger: Logger,
  ): CreateUserHttpResponse {
    logger.debug(`handleCreateUserOperation: ${JSON.stringify(request)}`);
    if (request.body.firstName === 'None') {
      return {
        status: 204,
      };
    }
    if (request.body.firstName === 'Existing') {
      return {
        status: 200,
        body: {
          ...request.body,
          id: '123',
        },
      };
    }
    if (request.body.firstName === 'Missing') {
      return {
        status: 404,
        body: {
          reason: 'Not found',
        },
      };
    }
    return {
      status: 201,
      body: {
        ...request.body,
        role: CreateUserResponsePayloadRoleEnum.Admin,
      },
    };
  }

  handleGetUser(
    request: GetUserHttpRequest,
    @inject('Logger') logger: Logger,
  ): GetUserHttpResponse {
    logger.debug(`handleGetUser: ${JSON.stringify(request)}`);
    return {
      body: {
        firstName: 'Kilty',
        lastName: 'McGowan',
        id: request.pathParams.id,
      },
      headers: {
        xExampleResponse: request.queryParams?.search?.join('!'),
      },
    };
  }

  // Demonstrates how a delegate can prevent the default response and send a response via the underlying response obj
  @addMetadata()
  handleMakeAdmin(
    request: MakeAdminHttpRequest,
    basicRouteParams: BasicRouteParams,
  ) {
    this.logger.debug(`handleMakeAdmin: ${JSON.stringify(request)}`);
    basicRouteParams.res.sendStatus(500);
    return PREVENT_DEFAULT_RESPONSE;
  }
}
