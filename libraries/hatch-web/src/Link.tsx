/* eslint-disable react/jsx-filename-extension -- this is a React component which might someday have JSX */
import React from 'react';
import {StyleProp, TextProps, TextStyle} from 'react-native';
import {Link, LinkProps} from 'react-router-dom';

import createReactNativeElement from './createReactNativeElement';

type InheritedProps = Pick<LinkProps, 'to'> & Pick<TextProps, 'testID' | 'style'>;

interface PropTypes extends InheritedProps {
  // Support for backwards compatibility
  textStyle?: StyleProp<TextStyle>;
}

type DefaultProps = {
  textStyle: undefined,
};

export default class extends React.PureComponent<PropTypes & DefaultProps> {
  public render() {
    // Pull out textStyle so we can map it to props.style of Link below.
    const {textStyle, ...otherProps} = this.props;

    // Delegate to react-native-web so that styles are translated properly
    return createReactNativeElement(Link, {style: textStyle, ...otherProps});
  }
}
