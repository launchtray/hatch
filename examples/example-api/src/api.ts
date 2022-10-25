// Implement this per https://github.com/airtasker/spot/wiki/Spot-Syntax
import * as spot from '@airtasker/spot';

interface CreateUserRequestPayload {
  firstName: string;
  lastName: string;
}

interface CreateUserResponsePayload {
  firstName: string;
  lastName: string;
  role: string;
}

interface User {
  firstName: string;
  lastName: string;
  id: string;
}

interface Metric {
  timestamp: spot.Int64;
  txId: string;
}

type UserResponse = User;

@spot.api({name: 'example-api'})
class Api {}

@spot.endpoint({
  method: 'POST',
  path: '/api/testers',
  tags: ['Testers'],
})
class CreateTester {
  @spot.request
  request(
    @spot.headers headers: {
      Authorization: string;
      'x-example-request'?: string;
    },
    @spot.body body: CreateUserRequestPayload,
  ) {}

  @spot.response({status: 201})
  response(
    @spot.headers h: {
      'x-example-response'?: string;
    },
    @spot.body body: CreateUserResponsePayload,
  ) {}
}

@spot.endpoint({
  method: 'POST',
  path: '/api/users',
  tags: ['Users'],
})
class CreateUser {
  @spot.request
  request(
    @spot.headers headers: {
      Authorization: string;
      'x-example-request'?: string;
    },
    @spot.body body: CreateUserRequestPayload,
  ) {}

  @spot.response({status: 201})
  response(
    @spot.headers headers: {
      'x-example-response'?: string;
    },
    @spot.body body: CreateUserResponsePayload,
  ) {}
}

@spot.endpoint({
  method: 'POST',
  path: '/api/make-admin/:id',
  tags: ['Users'],
})
class MakeAdmin {
  @spot.request
  request(
    @spot.pathParams pathParams: {
      id: string;
    },
    @spot.headers headers: {
      Authorization: string;
      'x-example-request'?: string;
    },
    @spot.body body: User,
  ) {}

  @spot.response({status: 201})
  response(
    @spot.headers headers: {
      'x-example-response'?: string;
    },
  ) {}
}

@spot.endpoint({
  method: 'GET',
  path: '/api/users/:id',
  tags: ['Users'],
})
class GetUser {
  @spot.request
  request(
    @spot.headers headers: {
      Authorization: string;
      'x-example-request'?: string;
    },
    @spot.queryParams queryParams: {
      search: string;
    },
    @spot.pathParams pathParams: {
      id: string;
    },
  ) {}

  @spot.response({status: 200})
  response(
    @spot.headers headers: {
      'x-example-response'?: string;
    },
    @spot.body body: UserResponse,
  ) {}
}

@spot.endpoint({
  method: 'POST',
  path: '/api/metrics/metrics-count',
  tags: ['Metrics'],
})
class GetLatestMetrics {
  @spot.request
  request(
    @spot.queryParams queryParams: {
      userId: string,
      tId: string,
    },
    @spot.body metricTypes: string[],
  ) {}

  @spot.response({status: 200})
  response(
    @spot.body body: spot.Int64,
  ) {}
}
