import {Button, navActions} from '@launchtray/hatch-web';
import React from 'react';
import {View} from 'react-native';
import {connect} from 'react-redux';

interface PropTypes {
  onButtonPress: () => void;
}

class Home extends React.Component<PropTypes> {
  public render() {
    return (
      <View style={{height: 100, justifyContent: 'space-around'}}>
        <Button testID={'helloButton'} onPressRoute={'/hello?a=1#b'} title={'Hello!'}/>
        <Button testID={'helloButton2'} onPress={this.props.onButtonPress} title={'Hello2!'}/>
      </View>
    );
  }
}

export default connect(
  null,
  (dispatch) => ({
    onButtonPress: () => {
      dispatch(navActions.navigate({route: '/hello'}));
    },
}))(Home);