import {containerSingleton, inject, Logger} from '@launchtray/hatch-util';
import {
  ApiAlternateAction,
  ApiDelegateResponse,
  CreateUserRequest,
  GetLatestMetricsRequest,
  GetLatestMetricsResponse,
  GetMetricsCountRequest,
  GetMetricsCountResponse,
  GetReportPdfRequest,
  GetReportPdfResponse,
  GetUserRequest,
  GetUserResponse,
  MakeAdminRequest,
  MetricsApiDelegate,
  PREVENT_CONTROLLER_RESPONSE,
  ReportApiDelegate,
  SaveMetricsRequest,
  SaveMetricsResponse,
  UsersApiDelegate,
} from '@launchtray/example-server-sdk';
import {BasicRouteParams} from '@launchtray/hatch-server-middleware';

@containerSingleton()
export default class UsersApiDelegateImpl implements UsersApiDelegate, MetricsApiDelegate, ReportApiDelegate {
  constructor(@inject('Logger') private logger: Logger) {
    logger.info('Constructing UsersApiControllerDelegateImpl');
  }

  handleGetReportPdf(request: GetReportPdfRequest): ApiDelegateResponse<GetReportPdfResponse> {
    this.logger.debug(`handleGetReportPdf: ${JSON.stringify(request)}`);
    throw new Error('Method not implemented.');
  }

  handleGetLatestMetrics(request: GetLatestMetricsRequest): ApiDelegateResponse<GetLatestMetricsResponse> {
    this.logger.debug(`handleGetLatestMetrics: ${JSON.stringify(request)}`);
    throw new Error('Method not implemented.');
  }

  handleGetMetricsCount(request: GetMetricsCountRequest): ApiDelegateResponse<GetMetricsCountResponse> {
    this.logger.debug(`handleGetMetricsCount: ${JSON.stringify(request)}`);
    throw new Error('Method not implemented.');
  }

  handleSaveMetrics(request: SaveMetricsRequest): ApiDelegateResponse<SaveMetricsResponse> {
    this.logger.debug(`handleSaveMetrics: ${JSON.stringify(request)}`);
    throw new Error('Method not implemented.');
  }

  handleCreateTester(
    request: CreateUserRequest,
    @inject('Logger') logger: Logger,
  ) {
    logger.debug(`handleCreateTester: ${JSON.stringify(request)}`);
    return new ApiAlternateAction(404, 'No testers found');
  }

  // Demonstrates how an error response can be sent
  handleCreateUser(
    request: CreateUserRequest,
    @inject('Logger') logger: Logger,
  ) {
    logger.debug(`handleCreateUserOperation: ${JSON.stringify(request)}`);
    return new ApiAlternateAction(500, 'Whaaaa?');
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
