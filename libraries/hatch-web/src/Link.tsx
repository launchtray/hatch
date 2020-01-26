import React from 'react';
import {StyleProp, TextProps, TextStyle} from 'react-native';
import {Link, LinkProps} from 'react-router-dom';

import createReactNativeElement from './createReactNativeElement';

type InheritedProps = Pick<LinkProps, 'to'> & Pick<TextProps, 'testID'>;

interface PropTypes extends InheritedProps {
  textStyle?: StyleProp<TextStyle>;
}

export default class extends React.Component<PropTypes> {
  public render() {
    // Pull out textStyle so we can map it to props.style of Link below.
    const {textStyle, ...otherProps} = this.props;

    // Delegate to react-native-web so that styles are translated properly
    return createReactNativeElement(Link, {style: textStyle, ...otherProps});
  }
}
