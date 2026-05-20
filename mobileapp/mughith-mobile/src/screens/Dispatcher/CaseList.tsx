import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';

import { Avatar, Card, EmptyState, Pill, Screen, TextDim } from '../../components/UI';
import { useI18n } from '../../lib/i18n';
import { listCases } from '../../lib/cases';
import { formatAgo } from '../../lib/time';
import { colors, severityColor, statusColor } from '../../lib/theme';
import type { EmergencyCase, SeverityLevel } from '../../types';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Tab = 'active' | 'closed' | 'all';
type SevFilter = 'all' | SeverityLevel;

export default function DispatcherCaseList() {
  const { t, num, isAr, tpl } = useI18n();
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<Tab>('active');
  const [sev, setSev] = useState<SevFilter>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [active, setActive] = useState<EmergencyCase[]>([]);
  const [closed, setClosed] = useState<EmergencyCase[]>([]);

  const load = useCallback(async () => {
    try {
      const [openR, assignedR, onSceneR, closedR, expiredR] = await Promise.all([
        listCases({ status: 'OPEN', page: 1, limit: 100 }),
        listCases({ status: 'ASSIGNED', page: 1, limit: 100 }),
        listCases({ status: 'ON_SCENE', page: 1, limit: 100 }),
        listCases({ status: 'CLOSED', page: 1, limit: 100 }),
        listCases({ status: 'EXPIRED', page: 1, limit: 100 }),
      ]);
      setActive([...openR.data, ...assignedR.data, ...onSceneR.data]);
      setClosed([...closedR.data, ...expiredR.data]);
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

  const base = useMemo(() => {
    if (tab === 'active') return active;
    if (tab === 'closed') return closed;
    return [...active, ...closed];
  }, [tab, active, closed]);

  const filtered = useMemo(() => {
    const lowQ = query.trim().toLowerCase();
    return base.filter((c) => {
      if (sev !== 'all' && c.severity !== sev) return false;
      if (lowQ) {
        return (
          c.address.toLowerCase().includes(lowQ) ||
          c.id.toLowerCase().includes(lowQ) ||
          (c.notes ?? '').toLowerCase().includes(lowQ)
        );
      }
      return true;
    });
  }, [base, sev, query]);

  const tabs: { k: Tab; label: string; count: number }[] = [
    { k: 'active', label: isAr ? 'النشطة' : 'Active', count: active.length },
    { k: 'closed', label: t('status_closed'), count: closed.length },
    { k: 'all', label: t('filter_all'), count: active.length + closed.length },
  ];

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
        <View
          style={{
            flexDirection: 'row',
            gap: 4,
            padding: 4,
            backgroundColor: colors.bgElev,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            alignSelf: 'flex-start',
          }}
        >
          {tabs.map((x) => (
            <Pressable
              key={x.k}
              onPress={() => setTab(x.k)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 6,
                backgroundColor: tab === x.k ? colors.card : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text
                style={{
                  color: tab === x.k ? colors.text : colors.textDim,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {x.label}
              </Text>
              <View
                style={{
                  backgroundColor: colors.bg,
                  borderRadius: 999,
                  paddingHorizontal: 6,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.textDim, fontSize: 10, fontWeight: '700' }}>
                  {num(x.count)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingVertical: 8 }}
        >
          {(['all', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as SevFilter[]).map((k) => (
            <Pressable
              key={k}
              onPress={() => setSev(k)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: sev === k ? colors.primary + '22' : colors.bgElev,
                borderWidth: 1,
                borderColor: sev === k ? colors.primary : colors.border,
              }}
            >
              <Text
                style={{
                  color: sev === k ? colors.primary : colors.text,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {k === 'all'
                  ? t('filter_all')
                  : k === 'CRITICAL'
                  ? t('filter_critical')
                  : k === 'HIGH'
                  ? t('filter_serious')
                  : k === 'MODERATE'
                  ? t('filter_moderate')
                  : t('filter_low')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('search_cases')}
          placeholderTextColor={colors.textDim}
          style={{
            backgroundColor: colors.bgElev,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: colors.text,
            fontSize: 14,
            marginBottom: 4,
          }}
        />
      </View>

      <FlatList
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
        data={filtered}
        keyExtractor={(c) => c.id}
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
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
          ) : (
            <EmptyState title={t('no_data')} />
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => nav.navigate('CaseDetail', { id: item.id })}>
            <Card>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                <Pill
                  label={t(`sev_${item.severity.toLowerCase()}`)}
                  color={severityColor(item.severity)}
                />
                <Pill
                  label={t(`status_${item.status.toLowerCase()}`)}
                  color={statusColor(item.status)}
                />
              </View>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.address}</Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 6,
                }}
              >
                {item.assignedTo ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Avatar name={item.assignedTo.name} size={20} />
                    <Text style={{ color: colors.text, fontSize: 11 }} numberOfLines={1}>
                      {item.assignedTo.name}
                    </Text>
                  </View>
                ) : (
                  <TextDim style={{ fontSize: 11 }}>—</TextDim>
                )}
                <TextDim style={{ fontSize: 11 }}>
                  {formatAgo(item.createdAt, t, tpl, num)}
                </TextDim>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </Screen>
  );
}
