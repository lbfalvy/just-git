import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../screenTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'repo'>;
export function RepoScreen({ navigation, route }: Props): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text>Operate on {route.params.path.at(-1)}</Text>
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