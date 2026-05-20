import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Card, EmptyState, Pill, Screen, TextDim } from '../../components/UI';
import { useI18n } from '../../lib/i18n';
import { getCaseHistory } from '../../lib/cases';
import { formatAgo } from '../../lib/time';
import { colors, severityColor, statusColor } from '../../lib/theme';
import type { EmergencyCase } from '../../types';

export default function VolunteerHistory() {
  const { t, isAr, num, tpl } = useI18n();
  const [items, setItems] = useState<EmergencyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await getCaseHistory();
      setItems(r);
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
      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>
          {t('case_history')}
        </Text>
        <TextDim style={{ fontSize: 12, marginTop: 2 }}>
          {isAr ? 'الحالات التي شاركت فيها' : 'Cases you responded to'}
        </TextDim>
      </View>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={items}
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
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text
                style={{ color: colors.text, fontWeight: '700', fontSize: 13, fontFamily: 'Menlo' }}
              >
                {item.id.slice(0, 8)}
              </Text>
              <TextDim style={{ fontSize: 10 }}>
                {formatAgo(item.createdAt, t, tpl, num)}
              </TextDim>
            </View>
            <Text style={{ color: colors.text, fontSize: 13, marginTop: 4 }}>{item.address}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <Pill
                label={t(`sev_${item.severity.toLowerCase()}`)}
                color={severityColor(item.severity)}
              />
              <Pill
                label={
                  item.outcome ? t('handed_off') : t(`status_${item.status.toLowerCase()}`)
                }
                color={statusColor(item.status)}
              />
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
