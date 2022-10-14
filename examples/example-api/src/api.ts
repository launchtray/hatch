// Implement this per https://github.com/airtasker/spot/wiki/Spot-Syntax
import {api, endpoint, request, response, body, pathParams, String} from '@airtasker/spot';
@api({ name: "example-api" })
class API {}

@endpoint({
  method: 'POST',
  path: '/api/users',
  tags: ['Users', 'Testers']
})
class CreateUser {
  @request
  request(@body body: CreateUserRequest) {}

  @response({ status: 201 })
  response(@body body: CreateUserResponse) {}
}

@endpoint({
  method: 'POST',
  path: '/api/make-admin',
  tags: ['Users']
})
class MakeAdmin {
  @request
  request(@body body: User) {}

  @response({ status: 201 })
  response() {}
}

/** Retrieve a user by their unique identifier */
@endpoint({
  method: "GET",
  path: "/api/users/:id",
  tags: ["Users"]
})
class GetUser {
  @request
  request(
    @pathParams
      pathParams: {
      /** Unique user identifier */
      id: String;
    }
  ) {}

  @response({ status: 200 })
  successResponse(@body body: UserResponse) {}

  @response({ status: 404 })
  notfoundResponse(@body body: ApiErrorResponse) {}
}

interface CreateUserRequest {
  firstName: string;
  lastName: string;
}

interface CreateUserResponse {
  firstName: string;
  lastName: string;
  role: string;
}

interface User {
  firstName: String;
  lastName: String;
  id: String;
}

type UserResponse = User;

interface ApiErrorResponse {
  message: String;
}
