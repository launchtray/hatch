import {Readable} from 'stream';
import {containerSingleton, inject, Logger} from '@launchtray/hatch-util';
import {
  ApiAlternateAction,
  ApiDelegateResponse,
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
  PREVENT_CONTROLLER_RESPONSE,
  ReportApiDelegate,
  SaveMetricsRequest,
  SaveMetricsResponse,
  UsersApiDelegate,
} from '@launchtray/example-server-sdk';
import {BasicRouteParams} from '@launchtray/hatch-server-middleware';
import {CreateTesterRequest} from '@launchtray/example-client-sdk';

@containerSingleton()
export default class UsersApiDelegateImpl implements UsersApiDelegate, MetricsApiDelegate, ReportApiDelegate {
  constructor(@inject('Logger') private logger: Logger) {
    logger.info('Constructing UsersApiControllerDelegateImpl');
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

  // Demonstrates how an error response can be sent
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
        xExampleResponse: request.queryParams.search,
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
    return PREVENT_CONTROLLER_RESPONSE;
  }
}
