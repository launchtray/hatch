import React from 'react';
import * as ReactNative from 'react-native';

export default <P>(type: React.ReactType, props?: P): React.ReactElement<P> => {
  const createElement = (ReactNative as any).createElement ?? (ReactNative as any).unstable_createElement;
  return createElement(type, props);
};
