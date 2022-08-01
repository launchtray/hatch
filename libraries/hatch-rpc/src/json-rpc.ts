import {
  AnyJson,
  AnyJsonObject,
} from '@launchtray/hatch-util';
import {
  RpcClient,
  RpcErrorCode,
  RpcNotificationHandler,
  RpcRequestHandler,
  RpcServer,
  RpcTransport,
} from './rpc';

const PROTOCOL_KEY = 'jsonrpc';
const PROTOCOL_VERSION = '2.0';

interface JsonRpcBaseMessage {
  [PROTOCOL_KEY]: typeof PROTOCOL_VERSION;
}

const PROTOCOL_METADATA: JsonRpcBaseMessage = {[PROTOCOL_KEY]: PROTOCOL_VERSION};

type JsonRpcRequestId = number | string;

interface JsonRpcRequest extends JsonRpcBaseMessage {
  id: JsonRpcRequestId;
  method: string;
  params: Array<AnyJson> | AnyJsonObject;
}

interface JsonRpcNotification extends JsonRpcBaseMessage {
  method: string;
  params: Array<AnyJson> | AnyJsonObject;
}

interface JsonRpcSuccessResponse extends JsonRpcBaseMessage {
  id: JsonRpcRequestId;
  result: AnyJson;
}

interface JsonRpcErrorResponse extends JsonRpcBaseMessage {
  id: JsonRpcRequestId;
  error: {
    code: number;
    message: string;
    data?: Array<AnyJson> | AnyJsonObject;
  };
}

type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

const isRequest = (message: unknown): message is JsonRpcRequest => {
  return (message as JsonRpcRequest).id != null && (message as JsonRpcRequest).method != null;
};

const isResponse = (message: unknown): message is JsonRpcResponse => {
  return (message as JsonRpcResponse).id != null;
};

const isNotificationOrRequest = (message: unknown): message is JsonRpcNotification | JsonRpcRequest => {
  return (message as JsonRpcNotification | JsonRpcRequest).method != null;
};

const isErrorResponse = (response: JsonRpcResponse): response is JsonRpcErrorResponse => {
  return (response as JsonRpcErrorResponse).error != null;
};

type PromiseCallbacks = {resolve: (value: unknown) => void, reject: (reason?: unknown) => void};

export class JsonRpcBus implements RpcServer, RpcClient {
  public readonly serviceName: string;
  public readonly supportsBuffer: boolean;
  private incomingRequestHandlers: Map<string, RpcRequestHandler>;
  private incomingNotificationHandlers: Map<string, Array<RpcNotificationHandler>>;
  private transport: RpcTransport;
  private readonly pendingOutgoingRequests: Map<JsonRpcRequestId, {promiseCallbacks: PromiseCallbacks, method: string}>;
  private nextId: number;

  constructor(transport: RpcTransport) {
    this.nextId = 1;
    this.pendingOutgoingRequests = new Map();
    this.incomingRequestHandlers = new Map();
    this.incomingNotificationHandlers = new Map();
    this.transport = transport;
    this.serviceName = transport.serviceName;
    this.supportsBuffer = transport.supportsBuffer;

    if (transport.registerTransportClosedHandler != null) {
      transport.registerTransportClosedHandler(async (error?: Error) => {
        this.handleTransportClosed(error);
      });
    }
    transport.registerMessageHandler(async (message: unknown) => {
      if (isRequest(message)) {
        const requestHandler = this.incomingRequestHandlers.get(message.method);
        if (requestHandler == null) {
          await this.respondNotImplemented(message.id);
        } else {
          try {
            const result = await requestHandler(message.params);
            this.respondWithResult(message.id, result);
          } catch (err) {
            this.respondWithError(message.id, {
              code: RpcErrorCode.SERVER_ERROR,
              message: `Error from service: ${(err as Error).message}`,
            });
          }
        }
      } else if (isResponse(message)) {
        const pendingRequest = this.pendingOutgoingRequests.get(message.id);
        if (pendingRequest != null) {
          this.pendingOutgoingRequests.delete(message.id);
          if (isErrorResponse(message)) {
            const method = `${this.serviceName}.${pendingRequest.method}`;
            const errMsg = `RPC error: ${method}: ${JSON.stringify(message.error)}`;
            pendingRequest.promiseCallbacks.reject(new Error(errMsg));
          } else {
            pendingRequest.promiseCallbacks.resolve(message.result);
          }
        }
      } else if (isNotificationOrRequest(message)) {
        await this.raiseNotification(message.method, message.params);
      }
    });
  }

  private respondWithError(id: JsonRpcRequestId, error: JsonRpcErrorResponse['error']) {
    const rpcResponse: JsonRpcErrorResponse = {
      ...PROTOCOL_METADATA,
      id,
      error,
    };
    this.transport.sendMessage(rpcResponse);
  }

  private respondNotImplemented(id: JsonRpcRequestId) {
    this.respondWithError(id, {
      code: RpcErrorCode.NOT_IMPLEMENTED,
      message: 'Method not implemented',
    });
  }

  private respondWithResult(id: JsonRpcRequestId, result: AnyJson) {
    const rpcResponse: JsonRpcSuccessResponse = {
      ...PROTOCOL_METADATA,
      id,
      result,
    };
    this.transport.sendMessage(rpcResponse);
  }

  private async raiseNotification(name: string, params: Array<AnyJson> | AnyJsonObject) {
    const handlers = this.incomingNotificationHandlers.get(name);
    if (handlers != null) {
      for (const handler of handlers) {
        await handler(params);
      }
    }
  }

  private handleTransportClosed(error?: Error) {
    for (const id of this.pendingOutgoingRequests.keys()) {
      this.pendingOutgoingRequests.get(id)?.promiseCallbacks.reject(error ?? new Error('RPC transport closed'));
    }
    this.pendingOutgoingRequests.clear();
  }

  public async request(method: string, params: Array<AnyJson> | AnyJsonObject): Promise<unknown> {
    const id = this.nextId;
    this.nextId += 1;
    return await new Promise((resolve, reject) => {
      this.pendingOutgoingRequests.set(id, {promiseCallbacks: {resolve, reject}, method});
      this.transport.sendMessage({
        ...PROTOCOL_METADATA,
        method,
        params,
        id,
      });
    });
  }

  public notify(method: string, params: Array<AnyJson> | AnyJsonObject) {
    this.transport.sendMessage({
      ...PROTOCOL_METADATA,
      method,
      params,
    });
  }

  public setRequestHandler(method: string, handler: RpcRequestHandler) {
    this.incomingRequestHandlers.set(method, handler);
  }

  public removeRequestHandler(method: string) {
    this.incomingRequestHandlers.delete(method);
  }

  public addNotificationHandler(method: string, handler: RpcNotificationHandler) {
    const existingHandlers = this.incomingNotificationHandlers.get(method) ?? [];
    existingHandlers.push(handler);
    this.incomingNotificationHandlers.set(method, existingHandlers);
    return () => {
      this.removeNotificationHandler(method, handler);
    };
  }

  public removeNotificationHandler(method: string, handler: RpcNotificationHandler) {
    const existingHandlers = this.incomingNotificationHandlers.get(method);
    if (existingHandlers != null) {
      const index = existingHandlers.indexOf(handler);
      if (index >= 0) {
        existingHandlers.splice(index, 1);
      }
    }
  }

  public removeAllNotificationHandlers(method: string) {
    this.incomingNotificationHandlers.delete(method);
  }

  public async close() {
    await this.transport.close();
  }
}
