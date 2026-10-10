// 应用入口：5 底部 Tab

import { Ionicons } from '@expo/vector-icons';
import {
  NavigationContainer,
  DefaultTheme,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';

import { AppProvider } from './src/state/AppContext';
import { colors } from './src/theme';
import WeightScreen from './src/screens/WeightScreen';
import FoodLibraryScreen from './src/screens/FoodLibraryScreen';
import IntakeScreen from './src/screens/IntakeScreen';
import StepScreen from './src/screens/StepScreen';
import SettingsScreen from './src/screens/SettingsScreen';

export type RootTabParamList = {
  体重: undefined;
  食物库: undefined;
  今日: undefined;
  步数: undefined;
  设置: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<
  keyof RootTabParamList,
  keyof typeof Ionicons.glyphMap
> = {
  体重: 'body-outline',
  食物库: 'restaurant-outline',
  今日: 'calendar-outline',
  步数: 'footsteps-outline',
  设置: 'settings-outline',
};

function tabIcon(
  routeName: keyof RootTabParamList,
  focused: boolean,
  color: string,
  size: number
) {
  const name = TAB_ICONS[routeName];
  const iconName = focused
    ? (name.replace('-outline', '') as keyof typeof Ionicons.glyphMap)
    : name;
  return <Ionicons name={iconName} size={size} color={color} />;
}

function RootTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTitle: () => (
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>
            {route.name}
          </Text>
        ),
        tabBarIcon: ({ focused, color, size }) =>
          tabIcon(route.name as keyof RootTabParamList, focused, color, size),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
      })}
    >
      <Tab.Screen name="体重" component={WeightScreen} />
      <Tab.Screen name="食物库" component={FoodLibraryScreen} />
      <Tab.Screen name="今日" component={IntakeScreen} />
      <Tab.Screen name="步数" component={StepScreen} />
      <Tab.Screen name="设置" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer theme={DefaultTheme}>
        <StatusBar style="auto" />
        <RootTabs />
      </NavigationContainer>
    </AppProvider>
  );
}
