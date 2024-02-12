import {Button, Image, navActions} from '@launchtray/hatch-web';
import React, {useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {connect} from 'react-redux';
import './example.css';

interface PropTypes {
  onButtonPress: () => void;
}

const Home = (props: PropTypes) => {
  const [disabled, setDisabled] = useState(false);
  return (
    <View style={styles.container}>
      <ol>
        <li>
          {'First'}
        </li>
      </ol>
      <Image
        style={{height: 100, width: 68, alignSelf: 'center'}}
        source={require('../assets/hatch_eyes.png')}
      />
      <Button testID={'helloButton2'} onPress={props.onButtonPress} title={'Nav via action'}/>
      <Button testID={'helloButton'} onPressRoute={'/hello?a=1#b'} title={'Nav via link'}/>
      <Button
        title={'Toggle'}
        onPress={() => {
          setDisabled(!disabled);
        }}
      />
      <Button
        title={'Throw'}
        disabled={disabled}
        onPress={() => {
          throw new Error('Test error');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 24,
    marginHorizontal: 32,
    backgroundColor: 'skyblue',
    height: 300,
    justifyContent: 'space-around',
  },
});

export default connect(
  null,
  (dispatch) => ({
    onButtonPress: () => {
      dispatch(navActions.navigate({route: '/hello'}));
    },
  }),
)(Home);
