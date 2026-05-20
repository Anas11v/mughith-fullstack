import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';

import { Button, Card, EmptyState, Pill, Screen, Spacer, TextDim } from '../../components/UI';
import { useI18n } from '../../lib/i18n';
import { useStore } from '../../store/useStore';
import { listNotifications, markRead } from '../../lib/notifications';
import { acceptCase, rejectCase } from '../../lib/dispatch';
import { getCase } from '../../lib/cases';
import { apiErrorMessage } from '../../lib/api';
import { colors, severityColor } from '../../lib/theme';
import type { EmergencyCase, AppNotification } from '../../types';
import type { RootStackParamList } from '../../navigation/RootNavigator';

export default function VolunteerAlert() {
  const { t, isAr } = useI18n();
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const setActiveCaseId = useStore((s) => s.setActiveCaseId);

  const [active, setActive] = useState<{ notif: AppNotification; caseData: EmergencyCase } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const notifs = await listNotifications(true);
      const alerts = notifs.filter((n) => n.type === 'CASE_ALERT' && n.caseId);
      let next: { notif: AppNotification; caseData: EmergencyCase } | null = null;
      for (const n of alerts) {
        try {
          const c = await getCase(n.caseId!);
          if (c.status === 'OPEN') {
            next = { notif: n, caseData: c };
            break;
          }
          await markRead(n.id).catch(() => {});
        } catch {
          await markRead(n.id).catch(() => {});
        }
      }
      setActive(next);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const i = setInterval(refresh, 12000);
    return () => clearInterval(i);
  }, [refresh]);

  const onAccept = async () => {
    if (!active) return;
    setWorking(true);
    try {
      await acceptCase(active.caseData.id);
      await markRead(active.notif.id).catch(() => {});
      setActiveCaseId(active.caseData.id);
      nav.navigate('VolunteerNavigate', { caseId: active.caseData.id });
    } catch (e) {
      Alert.alert(
        t('accept_alert'),
        apiErrorMessage(
          e,
          isAr ? 'تم تكليف متطوع آخر بهذه الحالة' : 'Another volunteer already accepted this case',
        ),
      );
      await markRead(active.notif.id).catch(() => {});
      await refresh();
    } finally {
      setWorking(false);
    }
  };

  const onDecline = async () => {
    if (!active) return;
    setWorking(true);
    try {
      await rejectCase(active.caseData.id);
      await refresh();
    } catch (e) {
      Alert.alert(t('reject_alert'), apiErrorMessage(e));
    } finally {
      setWorking(false);
    }
  };

  if (loading && !active) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!active) {
    return (
      <Screen>
        <ScrollView
          contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center' }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                refresh();
              }}
              tintColor={colors.text}
            />
          }
        >
          <EmptyState
            title={t('no_alerts')}
            subtitle={
              isAr ? 'ستظهر التنبيهات هنا فور ورودها.' : 'New dispatch alerts will appear here.'
            }
          />
        </ScrollView>
      </Screen>
    );
  }

  const { caseData } = active;
  const sevColor = severityColor(caseData.severity);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View
          style={{
            borderRadius: 16,
            padding: 20,
            backgroundColor: sevColor + '15',
            borderWidth: 1.5,
            borderColor: sevColor,
            marginBottom: 14,
          }}
        >
          <Text
            style={{
              color: sevColor,
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 1.5,
              marginBottom: 6,
            }}
          >
            ⚠ {isAr ? 'حالة طارئة' : 'EMERGENCY'}
          </Text>
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '900' }}>
            {isAr ? 'حالة جديدة' : 'New case'}
          </Text>
          <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 4, fontFamily: 'Menlo' }}>
            {caseData.id.slice(0, 12)}
          </Text>
          <View style={{ marginTop: 10 }}>
            <Pill label={t(`sev_${caseData.severity.toLowerCase()}`)} color={sevColor} />
          </View>
        </View>

        <Card>
          <Row label={t('location')} value={caseData.address} />
          <Row label={t('eta')} value={caseData.ambulanceEta ?? '—'} />
          <Row label={t('patient_condition')} value={caseData.notes ?? '—'} last />
        </Card>
        <Spacer />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              title={t('reject_alert')}
              size="lg"
              onPress={onDecline}
              loading={working}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              variant="danger"
              title={t('accept_alert')}
              size="lg"
              onPress={onAccept}
              loading={working}
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View
      style={{
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text
        style={{
          color: colors.textDim,
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.8,
        }}
      >
        {label.toUpperCase()}
      </Text>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}
