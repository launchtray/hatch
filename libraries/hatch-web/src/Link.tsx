import React from 'react';
import {createElement, StyleProp, TextProps, TextStyle} from 'react-native';
import {Link, LinkProps} from 'react-router-dom';

type InheritedProps = Pick<LinkProps, 'to'> & Pick<TextProps, 'testID' | 'nativeID'>;

interface PropTypes extends InheritedProps {
  textStyle?: StyleProp<TextStyle>;
}

export default class extends React.Component<PropTypes> {
  public render() {
    // Pull out textStyle so we can map it to props.style of Link below.
    const {textStyle, ...otherProps} = this.props;
    // Delegate to react-native-web so that styles are translated properly
    return createElement(Link, {style: textStyle, ...otherProps});
  }
}
