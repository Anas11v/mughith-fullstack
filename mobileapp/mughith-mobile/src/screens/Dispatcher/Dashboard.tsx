import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';

import { Avatar, Card, EmptyState, Pill, Screen, Spacer, StatCard, TextDim } from '../../components/UI';
import { useI18n } from '../../lib/i18n';
import { useStore } from '../../store/useStore';
import { listCases } from '../../lib/cases';
import { listDonators } from '../../lib/users';
import { donatorState } from '../../lib/geo';
import { formatAgo, formatResponseTime } from '../../lib/time';
import { colors, severityColor, statusColor } from '../../lib/theme';
import type { EmergencyCase, SeverityLevel } from '../../types';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Filter = 'all' | SeverityLevel;

export default function DispatcherDashboard() {
  const { t, num, tpl } = useI18n();
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const cases = useStore((s) => s.cases);
  const setCases = useStore((s) => s.setCases);
  const donators = useStore((s) => s.donators);
  const setDonators = useStore((s) => s.setDonators);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const refresh = useCallback(async () => {
    try {
      const [openR, assignedR, onSceneR, vols, allR] = await Promise.all([
        listCases({ status: 'OPEN', page: 1, limit: 50 }),
        listCases({ status: 'ASSIGNED', page: 1, limit: 50 }),
        listCases({ status: 'ON_SCENE', page: 1, limit: 50 }),
        listDonators({ page: 1, limit: 100 }),
        listCases({ page: 1, limit: 200 }),
      ]);
      const active = [...openR.data, ...assignedR.data, ...onSceneR.data];
      // Use allR data to compute today/avg-response stats but display active in store
      setCases(active.length > 0 ? [...active, ...allR.data.filter((c) => c.closedAt)] : allR.data);
      setDonators(vols.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setCases, setDonators]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const i = setInterval(refresh, 20000);
    return () => clearInterval(i);
  }, [refresh]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = cases.filter((c) => new Date(c.createdAt) >= today).length;
    const available = donators.filter((d) => donatorState(d) === 'AVAILABLE').length;
    const activeCases = cases.filter(
      (c) => c.status === 'OPEN' || c.status === 'ASSIGNED' || c.status === 'ON_SCENE',
    );
    const closed = cases.filter((c) => c.closedAt && c.assignedToId);
    let avgMs = 0;
    if (closed.length) {
      avgMs =
        closed.reduce(
          (a, c) => a + (new Date(c.closedAt!).getTime() - new Date(c.createdAt).getTime()),
          0,
        ) / closed.length;
    }
    return {
      active: activeCases.length,
      volunteers: available,
      avgResponse: formatResponseTime(avgMs),
      today: todayCount,
    };
  }, [cases, donators]);

  const activeList = useMemo(
    () =>
      cases.filter(
        (c) => c.status === 'OPEN' || c.status === 'ASSIGNED' || c.status === 'ON_SCENE',
      ),
    [cases],
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return activeList;
    return activeList.filter((c) => c.severity === filter);
  }, [activeList, filter]);

  const FILTERS: { k: Filter; key: string }[] = [
    { k: 'all', key: 'filter_all' },
    { k: 'CRITICAL', key: 'filter_critical' },
    { k: 'HIGH', key: 'filter_serious' },
    { k: 'MODERATE', key: 'filter_moderate' },
    { k: 'LOW', key: 'filter_low' },
  ];

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>
              {t('dash_title')}
            </Text>
            <TextDim style={{ fontSize: 12 }}>{t('dash_sub')}</TextDim>
          </View>
          <Pill label={t('updates_live')} color={colors.success} />
        </View>

        <Spacer />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
          <StatCard label={t('active_cases')} value={num(stats.active)} color={colors.primary} />
          <StatCard
            label={t('available_volunteers')}
            value={num(stats.volunteers)}
            color={colors.success}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <StatCard label={t('avg_response')} value={stats.avgResponse} color={colors.warning} />
          <StatCard label={t('cases_today')} value={num(stats.today)} color={colors.primaryDark} />
        </View>

        <Spacer />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
        >
          {FILTERS.map((f) => (
            <Pressable
              key={f.k}
              onPress={() => setFilter(f.k)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: filter === f.k ? colors.primary + '22' : colors.bgElev,
                borderWidth: 1,
                borderColor: filter === f.k ? colors.primary : colors.border,
              }}
            >
              <Text
                style={{
                  color: filter === f.k ? colors.primary : colors.text,
                  fontWeight: '700',
                  fontSize: 12,
                }}
              >
                {t(f.key)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Spacer />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <TextDim style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>
            {t('active_cases').toUpperCase()}
          </TextDim>
          <Pill label={num(filtered.length)} color={colors.primary} />
        </View>

        {loading && filtered.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
        ) : filtered.length === 0 ? (
          <EmptyState title={t('no_data')} />
        ) : (
          filtered.map((c) => (
            <TouchableOpacity key={c.id} onPress={() => nav.navigate('CaseDetail', { id: c.id })}>
              <Card>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                  <Pill
                    label={t(`sev_${c.severity.toLowerCase()}`)}
                    color={severityColor(c.severity)}
                  />
                  <Pill
                    label={t(`status_${c.status.toLowerCase()}`)}
                    color={statusColor(c.status)}
                  />
                </View>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
                  {c.address}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 6,
                  }}
                >
                  {c.assignedTo ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Avatar name={c.assignedTo.name} size={22} />
                      <Text style={{ color: colors.text, fontSize: 11 }} numberOfLines={1}>
                        {c.assignedTo.name}
                      </Text>
                    </View>
                  ) : (
                    <TextDim style={{ fontSize: 11 }}>—</TextDim>
                  )}
                  <TextDim style={{ fontSize: 11 }}>{formatAgo(c.createdAt, t, tpl, num)}</TextDim>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
