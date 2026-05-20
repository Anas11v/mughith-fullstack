import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Card, Pill, Screen, Spacer, TextDim } from '../../components/UI';
import { useI18n } from '../../lib/i18n';
import { colors } from '../../lib/theme';

interface Center {
  name: string;
  ops: number;
  cases: number;
  avg: string;
  status: 'online' | 'degraded';
  region: string;
}

export default function AdminCenters() {
  const { t, isAr, num } = useI18n();

  const centers: Center[] = [
    { name: 'DC-01 Riyadh', ops: 18, cases: 142, avg: '3:12', status: 'online', region: isAr ? 'الرياض' : 'Riyadh' },
    { name: 'DC-02 Jeddah', ops: 12, cases: 98, avg: '3:34', status: 'online', region: isAr ? 'جدّة' : 'Jeddah' },
    { name: 'DC-03 Makkah', ops: 9, cases: 58, avg: '2:58', status: 'online', region: isAr ? 'مكّة' : 'Makkah' },
    { name: 'DC-04 Dammam', ops: 7, cases: 41, avg: '4:21', status: 'degraded', region: isAr ? 'الدمّام' : 'Dammam' },
    { name: 'DC-05 Madinah', ops: 6, cases: 33, avg: '3:05', status: 'online', region: isAr ? 'المدينة' : 'Madinah' },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>
          {t('dispatch_centers')}
        </Text>
        <TextDim style={{ fontSize: 12, marginBottom: 10 }}>
          {t('centers_placeholder')}
        </TextDim>

        {centers.map((c) => (
          <Card key={c.name}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 6,
              }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: c.status === 'online' ? colors.success : colors.warning,
                }}
              />
              <Text
                style={{
                  color: colors.text,
                  fontSize: 14,
                  fontWeight: '800',
                  flex: 1,
                  fontFamily: 'Menlo',
                }}
              >
                {c.name}
              </Text>
              <Pill
                label={c.status === 'online' ? t('online') : t('degraded')}
                color={c.status === 'online' ? colors.success : colors.warning}
              />
            </View>
            <TextDim style={{ fontSize: 11, marginBottom: 10 }}>{c.region}</TextDim>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Mini label={t('operators')} value={num(c.ops)} />
              <Mini label={t('nav_cases')} value={num(c.cases)} />
              <Mini label={t('avg')} value={c.avg} />
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <TextDim style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6 }}>
        {label.toUpperCase()}
      </TextDim>
      <Text
        style={{
          color: colors.text,
          fontSize: 18,
          fontWeight: '800',
          marginTop: 2,
          fontFamily: 'Menlo',
        }}
      >
        {value}
      </Text>
    </View>
  );
}
