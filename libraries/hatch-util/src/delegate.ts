export default <T extends object, D extends object>(
  self: T,
  delegateObj: D,
): Pick<T, keyof T> & Pick<D, keyof D> => {
  return new Proxy(self, {
    get: (target: object, property: string | symbol) => {
      if (property in target) return target[property];
      const value = delegateObj[property];
      if (typeof (value) === 'function') {
        return new Proxy(value, {
          apply: (f, thisArg, argumentsList) => {
            const scope = (thisArg === target ? delegateObj : thisArg);
            return f.apply(scope, argumentsList);
          },
        });
      }
      return value;
    },
  }) as Pick<T, keyof T> & Pick<D, keyof D>;
};
