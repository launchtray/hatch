import React from 'react';
import {Button, ButtonProps, View} from 'react-native';
import Link from './Link';

interface PropTypesWithRoute extends Omit<ButtonProps, 'onPress'> {
  onPressRoute: string;
}

type PropTypes = PropTypesWithRoute | ButtonProps;

const isPropTypesWithRoute = (props: PropTypes): props is PropTypesWithRoute => {
  return (props as PropTypesWithRoute).onPressRoute !== undefined;
};

export default class extends React.Component<PropTypes> {
  public render() {
    const {props} = this;
    if (isPropTypesWithRoute(props)) {

      const {testID, onPressRoute, ...otherProps} = props;
      return (
        <View>
          <Link to={props.onPressRoute} testID={testID} textStyle={{textDecorationLine: 'none'}}>
            <Button onPress={() => null} {...otherProps}/>
          </Link>
        </View>
      );
    }
    return <Button {...props}/>;
  }
}
