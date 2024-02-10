import React from 'react';
import Link from './Link';
import {Button, ButtonProps, View} from 'react-native';

interface PropTypesWithRoute extends Omit<ButtonProps, 'onPress'> {
  onPressRoute: string;
}

type PropTypes = PropTypesWithRoute | ButtonProps;

const isPropTypesWithRoute = (props: PropTypes): props is PropTypesWithRoute => {
  return (props as PropTypesWithRoute).onPressRoute !== undefined;
};

export default (props: PropTypes) => {
  if (isPropTypesWithRoute(props)) {
    const {testID, onPressRoute, ...otherProps} = props;
    return (
      <Link to={onPressRoute} testID={testID} textStyle={{textDecorationLine: 'none'}}>
        <View testID={testID}>
          <Button onPress={() => null} {...otherProps}/>
        </View>
      </Link>
    );
  }
  return <Button {...props}/>;
};
