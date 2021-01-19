import React from 'react';
import {Image, ImageProps, ImageURISource} from 'react-native';

export default (props: ImageProps) => {
  return (
    <Image
      // See https://github.com/necolas/react-native-web/issues/543#issuecomment-310844971
      defaultSource={props.source as (ImageURISource | number)}
      {...props}
    />
  );
};
