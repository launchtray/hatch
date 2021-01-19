import React from 'react';
import * as ReactNative from 'react-native';

export default <P>(type: React.ReactType, props?: P): React.ReactElement<P> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentionally dynamic code
  const createElement = (ReactNative as any).createElement ?? (ReactNative as any).unstable_createElement;
  return createElement(type, props);
};
