import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import React from "react";
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { RootStackParamList } from './screenTypes';
import { HomeScreen } from './screens/Home';
import { RepoScreen } from './screens/Repo';
import { OptionsScreen } from './screens/Options';
import './polyfills';
import { CloneScreen } from './screens/Clone';

export default function App(): React.ReactElement {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName='home'>
        <Stack.Screen name="home" component={HomeScreen} options={{ title: 'Home' }} />
        <Stack.Screen name="repo" component={RepoScreen}
          options={({ route }) => ({ title: route.params.path.at(-1) })}
        />
        <Stack.Screen name='clone' component={CloneScreen} options={{ title: 'Clone' }} />
        <Stack.Screen name="options" component={OptionsScreen} options={{ title: 'Options' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const Stack = createNativeStackNavigator<RootStackParamList>();