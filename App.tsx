// 应用入口：4 底部 Tab

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
import ProfileScreen from './src/screens/ProfileScreen';
import FoodLibraryScreen from './src/screens/FoodLibraryScreen';
import IntakeScreen from './src/screens/IntakeScreen';
import StepScreen from './src/screens/StepScreen';

export type RootTabParamList = {
  我的: undefined;
  食物库: undefined;
  今日: undefined;
  步数: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<
  keyof RootTabParamList,
  keyof typeof Ionicons.glyphMap
> = {
  我的: 'person-outline',
  食物库: 'restaurant-outline',
  今日: 'calendar-outline',
  步数: 'footsteps-outline',
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
      <Tab.Screen name="我的" component={ProfileScreen} />
      <Tab.Screen name="食物库" component={FoodLibraryScreen} />
      <Tab.Screen name="今日" component={IntakeScreen} />
      <Tab.Screen name="步数" component={StepScreen} />
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
