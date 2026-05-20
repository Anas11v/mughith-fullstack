import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';

import { Avatar, Button, Card, EmptyState, Pill, Screen, Spacer, TextDim } from '../../components/UI';
import { useI18n } from '../../lib/i18n';
import { useStore } from '../../store/useStore';
import { setAvailability, getProfile } from '../../lib/users';
import { getCaseHistory } from '../../lib/cases';
import { listNotifications } from '../../lib/notifications';
import { apiErrorMessage } from '../../lib/api';
import { colors, severityColor, statusColor } from '../../lib/theme';
import type { EmergencyCase } from '../../types';

export default function VolunteerHome() {
  const { t, isAr, num } = useI18n();
  const nav = useNavigation<NavigationProp<Record<string, undefined>>>();
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);
  const [history, setHistory] = useState<EmergencyCase[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [me, hist, notifs] = await Promise.all([
        getProfile().catch(() => null),
        getCaseHistory().catch(() => [] as EmergencyCase[]),
        listNotifications(true).catch(() => []),
      ]);
      if (me) setUser(me);
      setHistory(hist);
      setUnreadAlerts(notifs.filter((n) => n.type === 'CASE_ALERT').length);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setUser]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const i = setInterval(refresh, 15000);
    return () => clearInterval(i);
  }, [refresh]);

  const toggleAvailability = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updated = await setAvailability(!user.isAvailable);
      setUser(updated);
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;
  const available = user.isAvailable;
  const recent = history[0];

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Avatar name={user.name} size={52} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }} numberOfLines={1}>
              {t('welcome')}, {user.name}
            </Text>
            <TextDim style={{ fontSize: 12 }} numberOfLines={1}>
              {user.certification ?? t('certified')} · {user.email}
            </TextDim>
          </View>
          <TouchableOpacity
            onPress={() => nav.navigate('VAlerts' as never)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.bgElev,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.text, fontSize: 16 }}>◈</Text>
            {unreadAlerts > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  backgroundColor: colors.danger,
                  borderRadius: 999,
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                  minWidth: 18,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                  {num(unreadAlerts)}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <View
          style={{
            borderRadius: 16,
            padding: 18,
            backgroundColor: available ? colors.primary : colors.bgElev,
            borderWidth: 1,
            borderColor: available ? colors.primary : colors.border,
            marginBottom: 14,
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 1,
              opacity: 0.85,
              marginBottom: 6,
            }}
          >
            {t('status').toUpperCase()}
          </Text>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 }}>
            {available ? t('you_are_available') : t('you_are_offline')}
          </Text>
          <Text style={{ color: '#fff', opacity: 0.85, marginBottom: 14, fontSize: 13 }}>
            {available ? t('will_be_notified') : t('go_online_hint')}
          </Text>
          <Button
            variant="secondary"
            title={available ? t('go_offline') : t('go_online')}
            onPress={toggleAvailability}
            loading={saving}
            style={{ backgroundColor: '#ffffff22', borderColor: '#ffffff55' }}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          <Card style={{ flex: 1 }}>
            <TextDim style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 2 }}>
              {t('total').toUpperCase()}
            </TextDim>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>
              {num(history.length)}
            </Text>
            <TextDim style={{ fontSize: 11 }}>{t('case_history').toLowerCase()}</TextDim>
          </Card>
          <Card style={{ flex: 1 }}>
            <TextDim style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 2 }}>
              {t('certification').toUpperCase()}
            </TextDim>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>
              {user.certification ?? '—'}
            </Text>
            <TextDim style={{ fontSize: 11 }}>
              {user.certExpiry
                ? new Date(user.certExpiry).toLocaleDateString(isAr ? 'ar' : 'en')
                : t('no_expiry')}
            </TextDim>
          </Card>
        </View>

        <Button
          variant="outline"
          title={t('open_alerts')}
          onPress={() => nav.navigate('VAlerts' as never)}
        />

        {loading && history.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : null}

        {recent ? (
          <View style={{ marginTop: 16 }}>
            <TextDim
              style={{
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              {t('recent').toUpperCase()}
            </TextDim>
            <Card>
              <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 2 }}>
                {recent.id.slice(0, 8)} · {t(`status_${recent.status.toLowerCase()}`)}
              </Text>
              <TextDim style={{ fontSize: 12 }}>{recent.address}</TextDim>
              <Spacer h={8} />
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pill
                  label={t(`sev_${recent.severity.toLowerCase()}`)}
                  color={severityColor(recent.severity)}
                />
                <Pill
                  label={recent.outcome ? t('handed_off') : t(`status_${recent.status.toLowerCase()}`)}
                  color={statusColor(recent.status)}
                />
              </View>
            </Card>
          </View>
        ) : !loading ? (
          <View style={{ marginTop: 16 }}>
            <EmptyState
              title={t('no_data')}
              subtitle={isAr ? 'لم تشارك في حالات بعد.' : 'No cases yet.'}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
