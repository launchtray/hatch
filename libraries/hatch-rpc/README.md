# hatch-rpc
This project is a TypeScript library that contains type definitions and helper classes 
for making remote procedure calls (RPC).

`rpc.ts` contains type definitions for generic RPC interfaces.

`json-rpc.ts` contains a basic implementation of this interface using a json-rpc implementation
that delegates to a generic transport interface for sending and receiving data.
