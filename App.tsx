// 应用入口：首启引导门控 + 4 底部 Tab

import { Ionicons } from '@expo/vector-icons';
import {
  NavigationContainer,
  DefaultTheme,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider, useApp } from './src/state/AppContext';
import { colors } from './src/theme';
import { t } from './src/i18n';
import './src/i18n/detect';
import ProfileScreen from './src/screens/ProfileScreen';
import FoodLibraryScreen from './src/screens/FoodLibraryScreen';
import IntakeScreen from './src/screens/IntakeScreen';
import StepScreen from './src/screens/StepScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

export type RootTabParamList = {
  Profile: undefined;
  Food: undefined;
  Today: undefined;
  Steps: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<
  keyof RootTabParamList,
  keyof typeof Ionicons.glyphMap
> = {
  Profile: 'person-outline',
  Food: 'restaurant-outline',
  Today: 'calendar-outline',
  Steps: 'footsteps-outline',
};

const TAB_KEYS: Record<keyof RootTabParamList, Parameters<typeof t>[0]> = {
  Profile: 'tab.profile',
  Food: 'tab.food',
  Today: 'tab.today',
  Steps: 'tab.steps',
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
      initialRouteName="Today"
      screenOptions={({ route }) => ({
        headerTitle: () => (
          <Text
            style={{ fontSize: 17, fontWeight: '600', color: colors.text }}
            maxFontSizeMultiplier={1.4}
          >
            {t(TAB_KEYS[route.name as keyof RootTabParamList])}
          </Text>
        ),
        tabBarLabel: t(TAB_KEYS[route.name as keyof RootTabParamList]),
        tabBarIcon: ({ focused, color, size }) =>
          tabIcon(route.name as keyof RootTabParamList, focused, color, size),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
      })}
    >
      <Tab.Screen name="Today" component={IntakeScreen} />
      <Tab.Screen name="Food" component={FoodLibraryScreen} />
      <Tab.Screen name="Steps" component={StepScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function Root() {
  const { config, loading } = useApp();
  if (loading || !config) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text
          style={{ marginTop: 12, fontSize: 14, color: colors.muted }}
          maxFontSizeMultiplier={1.4}
        >
          {t('common.loading')}
        </Text>
      </View>
    );
  }
  // 首启引导：未完成引导（onboarded=false）时展示向导
  if (!config.onboarded) {
    return <OnboardingScreen />;
  }
  return <RootTabs />;
}

export default function App() {
  return (
    <AppProvider>
      <SafeAreaProvider>
        <NavigationContainer theme={DefaultTheme}>
          <StatusBar style="auto" />
          <Root />
        </NavigationContainer>
      </SafeAreaProvider>
    </AppProvider>
  );
}
