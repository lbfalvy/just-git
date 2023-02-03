import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../screenTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'options'>;
export function OptionsScreen({ navigation }: Props): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text>Configure the app and Git</Text>
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