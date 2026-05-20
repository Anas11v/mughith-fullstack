import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Card, Pill, Screen, Spacer, StatCard, TextDim } from '../../components/UI';
import { useI18n } from '../../lib/i18n';
import { api, API_BASE_URL } from '../../lib/api';
import { colors } from '../../lib/theme';

interface Service {
  name: string;
  status: 'ok' | 'warn';
  latency: string;
}

export default function AdminSystem() {
  const { t, num } = useI18n();
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const ping = async () => {
      const start = Date.now();
      try {
        await api.get('/health');
        setHealthy(true);
        setLatency(Date.now() - start);
      } catch {
        setHealthy(false);
        setLatency(null);
      }
    };
    ping();
    const i = setInterval(ping, 15000);
    return () => clearInterval(i);
  }, []);

  const services: Service[] = [
    {
      name: t('api_gateway'),
      status: healthy === false ? 'warn' : 'ok',
      latency: latency != null ? `${latency}ms` : '—',
    },
    { name: t('dispatch_engine'), status: 'ok', latency: '41ms' },
    { name: t('notification_service'), status: 'ok', latency: '112ms' },
    { name: t('mapping'), status: 'ok', latency: '18ms' },
    { name: t('database'), status: 'ok', latency: '6ms' },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>
          {t('system_health')}
        </Text>
        <TextDim style={{ fontSize: 12, marginBottom: 10 }}>{t('services_status')}</TextDim>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
          <StatCard
            label={t('api_status')}
            value={healthy === null ? '…' : healthy ? 'OK' : 'DOWN'}
            color={healthy ? colors.success : colors.danger}
          />
          <StatCard
            label={t('api_latency')}
            value={latency != null ? `${latency}ms` : '—'}
            color={colors.primary}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <StatCard label={t('uptime')} value="99.95%" color={colors.warning} />
          <StatCard label={t('services')} value={num(services.length)} color={colors.primaryDark} />
        </View>

        <Spacer />
        <Card>
          <TextDim style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
            BACKEND
          </TextDim>
          <Text style={{ color: colors.text, fontSize: 12, fontFamily: 'Menlo', marginBottom: 6 }}>
            {API_BASE_URL}
          </Text>
        </Card>

        <Spacer />
        <Card>
          <TextDim style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>
            {t('services').toUpperCase()}
          </TextDim>
          {services.map((s, i) => (
            <View
              key={s.name}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 10,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: colors.border,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: s.status === 'ok' ? colors.success : colors.warning,
                }}
              />
              <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }}>{s.name}</Text>
              <TextDim style={{ fontSize: 11, fontFamily: 'Menlo' }}>{s.latency}</TextDim>
              <Pill
                label={s.status === 'ok' ? t('healthy') : t('warning')}
                color={s.status === 'ok' ? colors.success : colors.warning}
              />
            </View>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}
