export type AnyJson = boolean | number | string | null | undefined | Array<AnyJson> | AnyJsonObject;
export type AnyJsonObject = {[key: string]: AnyJson};
