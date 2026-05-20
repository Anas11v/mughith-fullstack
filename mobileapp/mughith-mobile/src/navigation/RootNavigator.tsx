import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { useStore } from '../store/useStore';
import { useI18n } from '../lib/i18n';
import { colors } from '../lib/theme';
import HeaderRight from '../components/HeaderRight';

import LoginScreen from '../screens/Auth/Login';
import RegisterScreen from '../screens/Auth/Register';

import VolunteerHome from '../screens/Volunteer/Home';
import VolunteerAlert from '../screens/Volunteer/Alert';
import VolunteerNavigate from '../screens/Volunteer/Navigate';
import VolunteerOnScene from '../screens/Volunteer/OnScene';
import VolunteerHistory from '../screens/Volunteer/History';
import VolunteerProfile from '../screens/Volunteer/Profile';

import DispatcherDashboard from '../screens/Dispatcher/Dashboard';
import DispatcherCases from '../screens/Dispatcher/CaseList';
import DispatcherCreate from '../screens/Dispatcher/CreateCase';
import DispatcherDetail from '../screens/Dispatcher/CaseDetail';
import DispatcherVolunteers from '../screens/Dispatcher/Volunteers';
import DispatcherReports from '../screens/Dispatcher/Reports';

import AdminHome from '../screens/Admin/Home';
import AdminApprovals from '../screens/Admin/Approvals';
import AdminUsers from '../screens/Admin/Users';
import AdminCenters from '../screens/Admin/Centers';
import AdminSystem from '../screens/Admin/System';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  VolunteerTabs: undefined;
  DispatcherTabs: undefined;
  AdminTabs: undefined;
  CaseDetail: { id: string };
  VolunteerNavigate: { caseId?: string };
  VolunteerOnScene: { caseId?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

const TabIcon = ({ glyph, color }: { glyph: string; color: string }) => (
  <Text style={{ color, fontSize: 18 }}>{glyph}</Text>
);

const headerOptions = {
  headerStyle: { backgroundColor: colors.bgElev },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '800' as const },
  headerRight: () => <HeaderRight />,
};

const tabScreenOptions = {
  ...headerOptions,
  tabBarStyle: {
    backgroundColor: colors.bgElev,
    borderTopColor: colors.border,
    height: 68,
    paddingTop: 6,
    paddingBottom: 10,
  },
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textDim,
  tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const },
};

function VolunteerTabs() {
  const { t } = useI18n();
  return (
    <Tabs.Navigator screenOptions={tabScreenOptions}>
      <Tabs.Screen
        name="VHome"
        component={VolunteerHome}
        options={{
          title: t('nav_home'),
          tabBarLabel: t('nav_home'),
          tabBarIcon: ({ color }) => <TabIcon glyph="◉" color={color} />,
        }}
      />
      <Tabs.Screen
        name="VAlerts"
        component={VolunteerAlert}
        options={{
          title: t('nav_alerts'),
          tabBarLabel: t('nav_alerts'),
          tabBarIcon: ({ color }) => <TabIcon glyph="◈" color={color} />,
        }}
      />
      <Tabs.Screen
        name="VHistory"
        component={VolunteerHistory}
        options={{
          title: t('nav_history'),
          tabBarLabel: t('nav_history'),
          tabBarIcon: ({ color }) => <TabIcon glyph="▤" color={color} />,
        }}
      />
      <Tabs.Screen
        name="VProfile"
        component={VolunteerProfile}
        options={{
          title: t('nav_profile'),
          tabBarLabel: t('nav_profile'),
          tabBarIcon: ({ color }) => <TabIcon glyph="☻" color={color} />,
        }}
      />
    </Tabs.Navigator>
  );
}

function DispatcherTabs() {
  const { t } = useI18n();
  return (
    <Tabs.Navigator screenOptions={tabScreenOptions}>
      <Tabs.Screen
        name="DDashboard"
        component={DispatcherDashboard}
        options={{
          title: t('nav_dashboard'),
          tabBarLabel: t('nav_dashboard'),
          tabBarIcon: ({ color }) => <TabIcon glyph="◐" color={color} />,
        }}
      />
      <Tabs.Screen
        name="DCases"
        component={DispatcherCases}
        options={{
          title: t('nav_cases'),
          tabBarLabel: t('nav_cases'),
          tabBarIcon: ({ color }) => <TabIcon glyph="▤" color={color} />,
        }}
      />
      <Tabs.Screen
        name="DNew"
        component={DispatcherCreate}
        options={{
          title: t('nav_new_case'),
          tabBarLabel: t('nav_new_case'),
          tabBarIcon: ({ color }) => <TabIcon glyph="+" color={color} />,
        }}
      />
      <Tabs.Screen
        name="DVolunteers"
        component={DispatcherVolunteers}
        options={{
          title: t('nav_volunteers'),
          tabBarLabel: t('nav_volunteers'),
          tabBarIcon: ({ color }) => <TabIcon glyph="☻" color={color} />,
        }}
      />
      <Tabs.Screen
        name="DReports"
        component={DispatcherReports}
        options={{
          title: t('nav_reports'),
          tabBarLabel: t('nav_reports'),
          tabBarIcon: ({ color }) => <TabIcon glyph="▦" color={color} />,
        }}
      />
    </Tabs.Navigator>
  );
}

function AdminTabs() {
  const { t } = useI18n();
  return (
    <Tabs.Navigator screenOptions={tabScreenOptions}>
      <Tabs.Screen
        name="AHome"
        component={AdminHome}
        options={{
          title: t('admin_console'),
          tabBarLabel: t('nav_home'),
          tabBarIcon: ({ color }) => <TabIcon glyph="◐" color={color} />,
        }}
      />
      <Tabs.Screen
        name="AApprovals"
        component={AdminApprovals}
        options={{
          title: t('nav_approvals'),
          tabBarLabel: t('nav_approvals'),
          tabBarIcon: ({ color }) => <TabIcon glyph="✓" color={color} />,
        }}
      />
      <Tabs.Screen
        name="AUsers"
        component={AdminUsers}
        options={{
          title: t('nav_users'),
          tabBarLabel: t('nav_users'),
          tabBarIcon: ({ color }) => <TabIcon glyph="☻" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ACenters"
        component={AdminCenters}
        options={{
          title: t('nav_centers'),
          tabBarLabel: t('nav_centers'),
          tabBarIcon: ({ color }) => <TabIcon glyph="◇" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ASystem"
        component={AdminSystem}
        options={{
          title: t('nav_system'),
          tabBarLabel: t('nav_system'),
          tabBarIcon: ({ color }) => <TabIcon glyph="⚙" color={color} />,
        }}
      />
    </Tabs.Navigator>
  );
}

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bgElev,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

export default function RootNavigator() {
  const user = useStore((s) => s.user);
  const accessToken = useStore((s) => s.accessToken);

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          ...headerOptions,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {!user || !accessToken ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ title: '', headerRight: undefined }}
            />
          </>
        ) : (
          <>
            {user.role === 'DISPATCHER' ? (
              <Stack.Screen
                name="DispatcherTabs"
                component={DispatcherTabs}
                options={{ headerShown: false }}
              />
            ) : user.role === 'ADMIN' ? (
              <Stack.Screen
                name="AdminTabs"
                component={AdminTabs}
                options={{ headerShown: false }}
              />
            ) : (
              <Stack.Screen
                name="VolunteerTabs"
                component={VolunteerTabs}
                options={{ headerShown: false }}
              />
            )}
            <Stack.Screen
              name="CaseDetail"
              component={DispatcherDetail}
              options={{ title: '' }}
            />
            <Stack.Screen
              name="VolunteerNavigate"
              component={VolunteerNavigate}
              options={{ title: '' }}
            />
            <Stack.Screen
              name="VolunteerOnScene"
              component={VolunteerOnScene}
              options={{ title: '' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
