import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';

import { Avatar, Button, Card, EmptyState, Pill, Screen, SectionTitle, Spacer, StatCard, TextDim } from '../../components/UI';
import { useI18n } from '../../lib/i18n';
import { listCases } from '../../lib/cases';
import { listDonators } from '../../lib/users';
import { colors } from '../../lib/theme';
import type { EmergencyCase, User } from '../../types';

export default function AdminHome() {
  const { t, isAr, num } = useI18n();
  const nav = useNavigation<NavigationProp<Record<string, undefined>>>();
  const [users, setUsers] = useState<User[]>([]);
  const [active, setActive] = useState<EmergencyCase[]>([]);
  const [allCases, setAllCases] = useState<EmergencyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [donatorR, openR, assignedR, onSceneR, allR] = await Promise.all([
        listDonators({ page: 1, limit: 100 }),
        listCases({ status: 'OPEN', page: 1, limit: 100 }),
        listCases({ status: 'ASSIGNED', page: 1, limit: 100 }),
        listCases({ status: 'ON_SCENE', page: 1, limit: 100 }),
        listCases({ page: 1, limit: 200 }),
      ]);
      setUsers(donatorR.data);
      setActive([...openR.data, ...assignedR.data, ...onSceneR.data]);
      setAllCases(allR.data);
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
      load();
    }, [load]),
  );

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = allCases.filter((c) => new Date(c.createdAt) >= today).length;
    const pending = users.filter((u) => !u.isVerified).length;
    return {
      volunteers: users.filter((u) => u.isVerified).length,
      pending,
      todayCases: todayCount,
      active: active.length,
    };
  }, [users, active, allCases]);

  const pendingList = users.filter((u) => !u.isVerified).slice(0, 5);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.text}
          />
        }
      >
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>
          {t('admin_console')}
        </Text>
        <TextDim style={{ fontSize: 12, marginBottom: 12 }}>{t('system_management')}</TextDim>

        {loading && allCases.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <StatCard
                label={t('nav_volunteers')}
                value={num(stats.volunteers)}
                sub={`+${num(stats.pending)} ${t('pending')}`}
                color={colors.primary}
              />
              <StatCard label={t('active_cases')} value={num(stats.active)} color={colors.success} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <StatCard label={t('cases_today')} value={num(stats.todayCases)} color={colors.warning} />
              <StatCard label={t('uptime')} value="99.97%" sub="30d" color={colors.primaryDark} />
            </View>

            <Spacer />
            <Card>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>
                  {t('pending_verification')}
                </Text>
                <Pill label={num(stats.pending)} color={colors.warning} />
              </View>
              {pendingList.length === 0 ? (
                <TextDim style={{ textAlign: 'center', padding: 12 }}>{t('no_data')}</TextDim>
              ) : (
                pendingList.map((p, i) => (
                  <View
                    key={p.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingVertical: 10,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: colors.border,
                    }}
                  >
                    <Avatar name={p.name} size={36} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <TextDim style={{ fontSize: 11 }} numberOfLines={1}>
                        {p.certification ?? t('certified')} · {p.email}
                      </TextDim>
                    </View>
                    <Button
                      size="sm"
                      variant="outline"
                      title={t('review')}
                      onPress={() => nav.navigate('AApprovals' as never)}
                    />
                  </View>
                ))
              )}
            </Card>

            <Spacer />
            <Card>
              <SectionTitle title={t('quick_actions')} subtitle={t('quick_links')} />
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Button
                  variant="secondary"
                  title={t('pending_approvals')}
                  onPress={() => nav.navigate('AApprovals' as never)}
                  style={{ minWidth: '47%' }}
                />
                <Button
                  variant="secondary"
                  title={t('nav_users')}
                  onPress={() => nav.navigate('AUsers' as never)}
                  style={{ minWidth: '47%' }}
                />
                <Button
                  variant="secondary"
                  title={t('dispatch_centers')}
                  onPress={() => nav.navigate('ACenters' as never)}
                  style={{ minWidth: '47%' }}
                />
                <Button
                  variant="secondary"
                  title={t('system_health')}
                  onPress={() => nav.navigate('ASystem' as never)}
                  style={{ minWidth: '47%' }}
                />
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
