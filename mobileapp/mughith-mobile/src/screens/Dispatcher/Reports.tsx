import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Avatar, Card, Pill, Screen, SectionTitle, Spacer, StatCard, TextDim } from '../../components/UI';
import { useI18n } from '../../lib/i18n';
import { listCases } from '../../lib/cases';
import { formatResponseTime } from '../../lib/time';
import { colors, severityColor } from '../../lib/theme';
import type { EmergencyCase } from '../../types';

export default function DispatcherReports() {
  const { t, num, isAr } = useI18n();
  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const all: EmergencyCase[] = [];
      const statuses = ['OPEN', 'ASSIGNED', 'ON_SCENE', 'CLOSED', 'EXPIRED'] as const;
      for (const s of statuses) {
        const r = await listCases({ status: s, page: 1, limit: 100 });
        all.push(...r.data);
      }
      setCases(all);
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

  const data = useMemo(() => {
    const now = new Date();
    const monthBars: number[] = Array(12).fill(0);
    const monthsList: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthsList.push(
        isAr
          ? d.toLocaleDateString('ar', { month: 'narrow' })
          : d.toLocaleDateString('en', { month: 'short' }),
      );
    }
    cases.forEach((c) => {
      const created = new Date(c.createdAt);
      const monthsAgo =
        (now.getFullYear() - created.getFullYear()) * 12 +
        (now.getMonth() - created.getMonth());
      const idx = 11 - monthsAgo;
      if (idx >= 0 && idx < 12) monthBars[idx] += 1;
    });

    const closed = cases.filter((c) => c.closedAt);
    let totalMs = 0;
    closed.forEach((c) => {
      totalMs += new Date(c.closedAt!).getTime() - new Date(c.createdAt).getTime();
    });
    const avgString = closed.length ? formatResponseTime(totalMs / closed.length) : '—';
    const assigned = cases.filter((c) => c.assignedToId).length;
    const acceptance = cases.length ? Math.round((assigned / cases.length) * 100) : 0;
    const handoff = closed.length
      ? Math.round((closed.filter((c) => c.outcome).length / closed.length) * 100)
      : 0;

    const sevCount: Record<string, number> = {};
    cases.forEach((c) => {
      sevCount[c.severity] = (sevCount[c.severity] || 0) + 1;
    });
    const totalCount = cases.length || 1;
    const sevPct = (['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map((k) => ({
      k,
      pct: Math.round(((sevCount[k] || 0) / totalCount) * 100),
    }));

    const respMap = new Map<string, { name: string; cases: number }>();
    closed.forEach((c) => {
      if (c.assignedTo) {
        const cur = respMap.get(c.assignedTo.id) ?? { name: c.assignedTo.name, cases: 0 };
        cur.cases += 1;
        respMap.set(c.assignedTo.id, cur);
      }
    });
    const top = Array.from(respMap.values()).sort((a, b) => b.cases - a.cases).slice(0, 5);

    return {
      bars: monthBars,
      months: monthsList,
      total: cases.length,
      avgString,
      acceptance,
      handoff,
      sevPct,
      top,
    };
  }, [cases, isAr]);

  const maxBar = Math.max(1, ...data.bars);

  const sevLabel = (k: string) =>
    k === 'CRITICAL'
      ? t('sev_critical')
      : k === 'HIGH'
      ? t('sev_high')
      : k === 'MODERATE'
      ? t('sev_moderate')
      : t('sev_low');

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
          {t('nav_reports')}
        </Text>
        <TextDim style={{ fontSize: 12, marginBottom: 12 }}>
          {isAr ? 'أداء الاستجابة · آخر ١٢ شهرًا' : 'Response performance · last 12 months'}
        </TextDim>

        {loading && cases.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <StatCard label={t('total_cases')} value={num(data.total)} color={colors.primary} />
              <StatCard label={t('avg_response')} value={data.avgString} color={colors.warning} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <StatCard
                label={t('acceptance_rate')}
                value={`${num(data.acceptance)}%`}
                color={colors.success}
              />
              <StatCard
                label={t('successful_handoff')}
                value={`${num(data.handoff)}%`}
                color={colors.primaryDark}
              />
            </View>

            <Spacer />
            <Card>
              <SectionTitle title={t('case_volume')} subtitle={t('monthly_volume')} />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  height: 160,
                  gap: 6,
                  paddingTop: 20,
                }}
              >
                {data.bars.map((b, i) => {
                  const isLast = i === data.bars.length - 1;
                  return (
                    <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                      <Text
                        style={{
                          color: isLast ? colors.primary : 'transparent',
                          fontSize: 10,
                          fontWeight: '800',
                          fontFamily: 'Menlo',
                        }}
                      >
                        {num(b)}
                      </Text>
                      <View
                        style={{
                          width: '100%',
                          height: `${(b / maxBar) * 100}%`,
                          minHeight: 4,
                          backgroundColor: isLast ? colors.primary : colors.primary + '44',
                          borderRadius: 4,
                        }}
                      />
                      <TextDim style={{ fontSize: 9 }}>{data.months[i]}</TextDim>
                    </View>
                  );
                })}
              </View>
            </Card>

            <Spacer />
            <Card>
              <SectionTitle title={t('by_severity')} />
              {data.sevPct.map((r) => {
                const c = severityColor(r.k);
                return (
                  <View key={r.k} style={{ marginBottom: 10 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                      }}
                    >
                      <Text style={{ color: colors.text, fontSize: 13 }}>{sevLabel(r.k)}</Text>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>
                        {num(r.pct)}%
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 8,
                        backgroundColor: colors.bgElev,
                        borderRadius: 4,
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          width: `${r.pct}%`,
                          height: '100%',
                          backgroundColor: c,
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </Card>

            <Spacer />
            <Card>
              <SectionTitle title={t('responders')} subtitle={t('top_responders')} />
              {data.top.length === 0 ? (
                <TextDim style={{ textAlign: 'center', padding: 12 }}>{t('no_data')}</TextDim>
              ) : (
                data.top.map((r, i) => (
                  <View
                    key={r.name + i}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingVertical: 8,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: 18,
                        fontWeight: '900',
                        width: 30,
                        fontFamily: 'Menlo',
                      }}
                    >
                      #{num(i + 1)}
                    </Text>
                    <Avatar name={r.name} size={32} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '700' }}>{r.name}</Text>
                      <TextDim style={{ fontSize: 11 }}>
                        {num(r.cases)} {isAr ? 'حالة' : 'cases'}
                      </TextDim>
                    </View>
                  </View>
                ))
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
