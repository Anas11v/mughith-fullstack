import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Avatar, Card, EmptyState, Pill, Screen, Spacer, StatCard, TextDim } from '../../components/UI';
import { useI18n } from '../../lib/i18n';
import { listDonators } from '../../lib/users';
import { donatorState, type DonatorPresence } from '../../lib/geo';
import { colors, presenceColor } from '../../lib/theme';
import type { User } from '../../types';

type Filter = 'all' | DonatorPresence;

export default function DispatcherVolunteers() {
  const { t, isAr, num } = useI18n();
  const [vols, setVols] = useState<User[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await listDonators({ page: 1, limit: 100 });
      setVols(r.data ?? []);
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
    const verified = vols.filter((v) => v.isVerified).length;
    const available = vols.filter((v) => donatorState(v) === 'AVAILABLE').length;
    const busy = vols.filter((v) => donatorState(v) === 'BUSY').length;
    return { total: verified, available, busy, registered: vols.length };
  }, [vols]);

  const filtered = useMemo(() => {
    if (filter === 'all') return vols;
    return vols.filter((v) => donatorState(v) === filter);
  }, [vols, filter]);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12 }}
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
          {t('nav_volunteers')}
        </Text>
        <TextDim style={{ fontSize: 12, marginBottom: 12 }}>
          {isAr ? 'المتطوعون المعتمدون ضمن المنطقة' : 'Certified volunteers within region'}
        </TextDim>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <StatCard label={t('cert_total')} value={num(stats.total)} color={colors.primary} />
          <StatCard label={t('available_now')} value={num(stats.available)} color={colors.success} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <StatCard label={t('responding')} value={num(stats.busy)} color={colors.warning} />
          <StatCard
            label={t('total_registered')}
            value={num(stats.registered)}
            color={colors.primaryDark}
          />
        </View>

        <Spacer />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
        >
          {(['all', 'AVAILABLE', 'BUSY', 'OFFLINE'] as Filter[]).map((k) => (
            <Pressable
              key={k}
              onPress={() => setFilter(k)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: filter === k ? colors.primary + '22' : colors.bgElev,
                borderWidth: 1,
                borderColor: filter === k ? colors.primary : colors.border,
              }}
            >
              <Text
                style={{
                  color: filter === k ? colors.primary : colors.text,
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {k === 'all'
                  ? t('filter_all')
                  : k === 'AVAILABLE'
                  ? t('available')
                  : k === 'BUSY'
                  ? t('busy')
                  : t('offline')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </ScrollView>

      <FlatList
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30, paddingTop: 8 }}
        data={filtered}
        keyExtractor={(u) => u.id}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
          ) : (
            <EmptyState
              title={vols.length === 0 ? t('no_volunteers') : t('no_volunteers_match')}
            />
          )
        }
        renderItem={({ item }) => {
          const state = donatorState(item);
          return (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Avatar name={item.name} size={42} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <TextDim style={{ fontSize: 12 }} numberOfLines={1}>
                    {item.certification ?? t('certified')} · {item.email}
                  </TextDim>
                </View>
                <Pill
                  label={
                    state === 'AVAILABLE'
                      ? t('available')
                      : state === 'BUSY'
                      ? t('busy')
                      : t('offline')
                  }
                  color={presenceColor(state)}
                />
              </View>
              {item.phone ? (
                <TextDim style={{ fontSize: 11, marginTop: 6, fontFamily: 'Menlo' }}>
                  {item.phone}
                </TextDim>
              ) : null}
            </Card>
          );
        }}
      />
    </Screen>
  );
}
