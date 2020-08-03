import React from 'react';
import {Image, ImageProps} from 'react-native';

export default class extends React.Component<ImageProps> {
  public render() {
    return (
      <Image
        // See https://github.com/necolas/react-native-web/issues/543#issuecomment-310844971
        defaultSource={this.props.source as any}
        {...this.props}
      />
    );
  }
}
