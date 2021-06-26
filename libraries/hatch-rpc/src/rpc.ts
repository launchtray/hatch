import {AnyJson, AnyJsonObject} from '@launchtray/hatch-util';

export type RpcRequestHandler = (params: Array<AnyJson> | AnyJsonObject) => Promise<AnyJson>;
export type RpcNotificationHandler = (params: Array<AnyJson> | AnyJsonObject) => void;

export interface RpcBase {
  notify(method: string, params: Array<AnyJson> | AnyJsonObject): void;
  addNotificationHandler(method: string, handler: RpcNotificationHandler): void;
  removeNotificationHandler(method: string, handler: RpcNotificationHandler): void;
  removeAllNotificationHandlers(method: string): void;
  close(): Promise<void>;
  supportsBuffer: boolean;
}

export interface RpcClient extends RpcBase {
  request(method: string, params: Array<AnyJson> | AnyJsonObject): Promise<unknown>;
}

export interface RpcServer extends RpcBase {
  setRequestHandler(method: string, handler: RpcRequestHandler): void;
  removeRequestHandler(method: string): void;
}

export enum RpcErrorCode {
  NOT_IMPLEMENTED = -32601,
  SERVER_ERROR = -32000,
}

export type RpcTransportMessageHandler = (message: unknown) => Promise<void>;
export type RpcTransportClosedHandler = (error?: Error) => void;

export interface RpcTransport {
  registerMessageHandler(handler: RpcTransportMessageHandler): void;
  registerTransportClosedHandler?(handler: RpcTransportClosedHandler): void;
  sendMessage(message: unknown): void;
  close(): Promise<void>;
  serviceName: string;
  supportsBuffer: boolean;
}
