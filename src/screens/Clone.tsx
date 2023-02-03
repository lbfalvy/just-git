import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../screenTypes';
import * as isogit from '../isogit';
import * as efs from 'expo-file-system';
import React from 'react';

type Props = NativeStackScreenProps<RootStackParamList, 'clone'>;
export function CloneScreen({ navigation }: Props): React.ReactElement {
  const [url, setUrl] = React.useState('https://github.com/');
  const [error, setError] = React.useState<string>();
  const [isWorking, setIsWorking] = React.useState(false);
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text>Select a repository to clone</Text>
      <TextInput style={{ borderColor: error && '#ff0000' }} value={url} onChangeText={setUrl} />
      <Button title='clone' disabled={isWorking} onPress={async () => {
        setIsWorking(true);
        const pathResult = await efs.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (pathResult.granted) {
          try {
            await isogit.clone(pathResult.directoryUri, url);
          } catch(e: any) {
            // setError(e.message);
            setIsWorking(false);
            throw e;
          }
        }
        setIsWorking(false);
      }} />
      {error && <Text style={{ color: '#ff0000' }}>{error}</Text>}
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