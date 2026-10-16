// 应用入口：首启引导门控 + 3 底部 Tab

import { Ionicons } from '@expo/vector-icons';
import {
  NavigationContainer,
  DefaultTheme,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppProvider, useApp } from './src/state/AppContext';
import { Button } from './src/components/ui';
import { colors, spacing, typeScale } from './src/theme';
import { t } from './src/i18n';
import './src/i18n/detect';
import ProfileScreen from './src/screens/ProfileScreen';
import FoodLibraryScreen from './src/screens/FoodLibraryScreen';
import IntakeScreen from './src/screens/IntakeScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

export type RootTabParamList = {
  Profile: undefined;
  Food: undefined;
  Today: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<
  keyof RootTabParamList,
  keyof typeof Ionicons.glyphMap
> = {
  Profile: 'person-circle-outline',
  Food: 'nutrition-outline',
  Today: 'home-outline',
};

const TAB_KEYS: Record<keyof RootTabParamList, Parameters<typeof t>[0]> = {
  Profile: 'tab.profile',
  Food: 'tab.food',
  Today: 'tab.today',
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
  // 自定义 tabBarStyle 会整体覆盖导航库默认的 paddingBottom: insets.bottom，
  // 必须手动把底部安全区（手势条/系统导航栏高度）加回来，否则 Tab 会被系统条遮挡
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      initialRouteName="Today"
      screenOptions={({ route }) => ({
        headerTitle: () => (
          <Text
            style={{ fontSize: typeScale.title, fontWeight: '700', color: colors.text }}
            maxFontSizeMultiplier={1.4}
          >
            {t(TAB_KEYS[route.name as keyof RootTabParamList])}
          </Text>
        ),
        tabBarLabel: t(TAB_KEYS[route.name as keyof RootTabParamList]),
        tabBarAccessibilityLabel: t(TAB_KEYS[route.name as keyof RootTabParamList]),
        tabBarIcon: ({ focused, color, size }) =>
          tabIcon(route.name as keyof RootTabParamList, focused, color, size),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        headerStyle: {
          backgroundColor: colors.bg,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleAlign: 'center',
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.line,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 6 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Today" component={IntakeScreen} />
      <Tab.Screen name="Food" component={FoodLibraryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function Root() {
  const { config, loading, bootError, retryBoot } = useApp();
  if (bootError && !config) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg,
          padding: spacing.xl,
        }}
      >
        <Text
          style={{ fontSize: 15, color: colors.text, textAlign: 'center', marginBottom: spacing.lg }}
          maxFontSizeMultiplier={1.6}
        >
          {t('common.bootError')}
        </Text>
        <Button title={t('common.retry')} onPress={retryBoot} />
      </View>
    );
  }
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
        <NavigationContainer
          theme={{
            ...DefaultTheme,
            colors: {
              ...DefaultTheme.colors,
              background: colors.bg,
              card: colors.card,
              border: colors.line,
              text: colors.text,
              primary: colors.accent,
            },
          }}
        >
          <StatusBar style="auto" />
          <Root />
        </NavigationContainer>
      </SafeAreaProvider>
    </AppProvider>
  );
}
