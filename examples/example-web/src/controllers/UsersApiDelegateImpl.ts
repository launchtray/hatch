import {Readable} from 'stream';
import {
  ApiAlternateAction,
  ApiDelegateResponse,
  containerSingleton,
  inject,
  Logger,
  PREVENT_DEFAULT_RESPONSE,
} from '@launchtray/hatch-util';
import {
  CreateUserRequest,
  CreateUserResponse,
  CreateUserResponsePayloadRoleEnum,
  GetLatestMetricsRequest,
  GetLatestMetricsResponse,
  GetMetricsCountRequest,
  GetMetricsCountResponse,
  GetReportPdfRequest,
  GetReportPdfResponse,
  GetUserRequest,
  GetUserResponse,
  MakeAdminRequest,
  Metric,
  MetricsApiDelegate,
  ReportApiDelegate,
  SaveMetricsRequest,
  SaveMetricsResponse,
  UsersApiDelegate,
} from '@launchtray/example-server-sdk';
import {BasicRouteParams, WebSocketRouteParams} from '@launchtray/hatch-server-middleware';
import {CreateTesterRequest} from '@launchtray/example-client-sdk';
import {appInfoProvider, route} from '@launchtray/hatch-server';
import WebSocket from 'ws';

@containerSingleton()
export default class UsersApiDelegateImpl implements UsersApiDelegate, MetricsApiDelegate, ReportApiDelegate {
  constructor(@inject('Logger') private logger: Logger) {
    logger.info('Constructing UsersApiControllerDelegateImpl');
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

  handleGetReportPdf(request: GetReportPdfRequest & {isFromSsr: boolean}): GetReportPdfResponse | ApiAlternateAction {
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
      body: Readable.toWeb(readable),
    };
  }

  handleGetLatestMetrics(request: GetLatestMetricsRequest): GetLatestMetricsResponse {
    this.logger.debug(`handleGetLatestMetrics: ${JSON.stringify(request)}`);
    const body: {[key: string]: Metric} = {};
    for (const metricType of request.body) {
      body[metricType] = {timestamp: 0, txId: 'abc'};
    }
    return {
      body,
    };
  }

  handleGetMetricsCount(request: GetMetricsCountRequest): GetMetricsCountResponse {
    this.logger.debug(`handleGetMetricsCount: ${JSON.stringify(request)}`);
    return {
      body: [1, 2, 3],
    };
  }

  handleSaveMetrics(request: SaveMetricsRequest): ApiDelegateResponse<SaveMetricsResponse> {
    this.logger.debug(`handleSaveMetrics: ${JSON.stringify(request)}`);
    throw new Error('Method not implemented.');
  }

  handleCreateTester(
    request: CreateTesterRequest,
    @inject('Logger') logger: Logger,
  ) {
    logger.debug(`handleCreateTester: ${JSON.stringify(request)}`);
    return new ApiAlternateAction(404, 'No testers found');
  }

  handleCreateUser(
    request: CreateUserRequest,
    @inject('Logger') logger: Logger,
  ): CreateUserResponse {
    logger.debug(`handleCreateUserOperation: ${JSON.stringify(request)}`);
    return {
      headers: {

      },
      body: {
        ...request.body,
        role: CreateUserResponsePayloadRoleEnum.Admin,
      },
    };
  }

  handleGetUser(
    request: GetUserRequest,
    @inject('Logger') logger: Logger,
  ): GetUserResponse {
    logger.debug(`handleGetUser: ${JSON.stringify(request)}`);
    return {
      body: {
        firstName: 'Kilty',
        lastName: 'McGowan',
        id: request.pathParams.id,
      },
      headers: {
        xExampleResponse: request.queryParams.search?.join('!'),
      },
    };
  }

  // Demonstrates how a delegate can prevent the default response and send a response via the underlying response obj
  handleMakeAdmin(
    request: MakeAdminRequest,
    @inject('Logger') logger: Logger,
    basicRouteParams: BasicRouteParams,
  ) {
    logger.debug(`handleMakeAdmin: ${JSON.stringify(request)}`);
    basicRouteParams.res.sendStatus(500);
    return PREVENT_DEFAULT_RESPONSE;
  }
}
