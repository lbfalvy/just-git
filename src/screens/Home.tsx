import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../screenTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'home'>;
export function HomeScreen({ navigation }: Props): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your app!</Text>
      <Button title='foo-bar' onPress={() => {
        navigation.navigate('repo', { path: '/path/to/foo-bar'.split('/') })
      }} />
      <Button title='Clone new' onPress={() => navigation.navigate('clone')} />
      <StatusBar style="auto" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});