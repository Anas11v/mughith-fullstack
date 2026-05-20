import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Avatar, Card, EmptyState, Pill, Screen, TextDim } from '../../components/UI';
import { useI18n } from '../../lib/i18n';
import { listDonators } from '../../lib/users';
import { formatAgo } from '../../lib/time';
import { colors } from '../../lib/theme';
import type { User } from '../../types';

export default function AdminUsers() {
  const { t, num, tpl } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await listDonators({ page: 1, limit: 100 });
      setUsers(r.data);
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

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>
          {t('users_roles')}
        </Text>
        <TextDim style={{ fontSize: 12, marginBottom: 10 }}>{t('manage_accounts')}</TextDim>
      </View>

      <FlatList
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
        data={users}
        keyExtractor={(u) => u.id}
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
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar name={item.name} size={36} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
                  {item.name}
                </Text>
                <TextDim style={{ fontSize: 11 }} numberOfLines={1}>
                  {item.email}
                </TextDim>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <Pill label={item.role} color={colors.primary} />
              <Pill
                label={item.isVerified ? t('verified') : t('not_verified')}
                color={item.isVerified ? colors.success : colors.warning}
              />
              <Pill
                label={item.isAvailable ? t('available') : t('offline')}
                color={item.isAvailable ? colors.success : colors.textDim}
              />
              {item.isBusy ? <Pill label={t('busy')} color={colors.warning} /> : null}
            </View>
            <TextDim style={{ fontSize: 10, marginTop: 6 }}>
              {t('created')} · {formatAgo(item.createdAt, t, tpl, num)}
            </TextDim>
          </Card>
        )}
      />
    </Screen>
  );
}
