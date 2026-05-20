import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Avatar, Button, Card, EmptyState, Pill, Screen, TextDim } from '../../components/UI';
import { useI18n } from '../../lib/i18n';
import { listDonators, verifyDonator } from '../../lib/users';
import { formatAgo } from '../../lib/time';
import { apiErrorMessage } from '../../lib/api';
import { colors } from '../../lib/theme';
import type { User } from '../../types';

type Filter = 'pending' | 'approved' | 'all';

export default function AdminApprovals() {
  const { t, isAr, num, tpl } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

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

  const handleVerify = async (id: string) => {
    setVerifying(id);
    try {
      await verifyDonator(id);
      await load();
    } catch (e) {
      Alert.alert(t('approve'), apiErrorMessage(e));
    } finally {
      setVerifying(null);
    }
  };

  const shown = useMemo(() => {
    if (filter === 'pending') return users.filter((u) => !u.isVerified);
    if (filter === 'approved') return users.filter((u) => u.isVerified);
    return users;
  }, [users, filter]);

  const filters: { k: Filter; label: string }[] = [
    { k: 'pending', label: t('pending_filter') },
    { k: 'approved', label: t('approved_filter') },
    { k: 'all', label: t('filter_all') },
  ];

  return (
    <Screen>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>
          {isAr ? 'اعتماد المتطوعين' : 'Volunteer approvals'}
        </Text>
        <TextDim style={{ fontSize: 12, marginBottom: 10 }}>
          {isAr ? 'مراجعة طلبات الانضمام والوثائق' : 'Review applications and certifications'}
        </TextDim>

        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
          {filters.map((f) => (
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
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
        data={shown}
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
              <Avatar name={item.name} size={42} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
                  {item.name}
                </Text>
                <TextDim style={{ fontSize: 11 }} numberOfLines={1}>
                  {item.certification ?? '—'} · {item.email}
                </TextDim>
                <TextDim style={{ fontSize: 10, marginTop: 2 }}>
                  {t('submitted')} {formatAgo(item.createdAt, t, tpl, num)}
                </TextDim>
              </View>
              <Pill
                label={item.isVerified ? t('verified') : t('not_verified')}
                color={item.isVerified ? colors.success : colors.warning}
              />
            </View>
            {!item.isVerified ? (
              <View style={{ marginTop: 10 }}>
                <Button
                  size="sm"
                  title={t('approve')}
                  onPress={() => handleVerify(item.id)}
                  loading={verifying === item.id}
                />
              </View>
            ) : null}
          </Card>
        )}
      />
    </Screen>
  );
}
