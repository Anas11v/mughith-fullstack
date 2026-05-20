import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button, Card, EmptyState, Pill, Screen, Spacer, TextDim } from '../../components/UI';
import { useI18n } from '../../lib/i18n';
import { useStore } from '../../store/useStore';
import { getCase, updateCaseStatus } from '../../lib/cases';
import { apiErrorMessage } from '../../lib/api';
import { colors, severityColor } from '../../lib/theme';
import type { EmergencyCase } from '../../types';
import type { RootStackParamList } from '../../navigation/RootNavigator';

export default function VolunteerOnScene() {
  const { t, isAr } = useI18n();
  const route = useRoute<RouteProp<RootStackParamList, 'VolunteerOnScene'>>();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const activeCaseId = useStore((s) => s.activeCaseId);
  const setActiveCaseId = useStore((s) => s.setActiveCaseId);

  const targetId = route.params?.caseId ?? activeCaseId ?? null;

  const [caseData, setCaseData] = useState<EmergencyCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const [hr, setHr] = useState('');
  const [bp, setBp] = useState('');
  const [spo2, setSpo2] = useState('');
  const [gcs, setGcs] = useState('');
  const [actions, setActions] = useState<boolean[]>([false, false, false, false]);
  const [stabilized, setStabilized] = useState(false);

  useEffect(() => {
    (async () => {
      if (!targetId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const c = await getCase(targetId);
        if (c.status === 'CLOSED' || c.status === 'EXPIRED') {
          setActiveCaseId(null);
          setCaseData(null);
          return;
        }
        setCaseData(c);
        if (c.status === 'ASSIGNED') {
          await updateCaseStatus(c.id, 'ON_SCENE').catch(() => {});
        }
      } catch (e) {
        Alert.alert(t('error_generic'), apiErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [targetId, setActiveCaseId, t]);

  const actionsList = isAr
    ? ['تم فحص المجرى الهوائي', 'وضع الضحية في وضعية آمنة', 'تم إعطاء الأكسجين', 'السيطرة على النزيف']
    : ['Airway assessed', 'Recovery position', 'Oxygen administered', 'Bleeding controlled'];

  const onHandoff = async () => {
    if (!caseData) return;
    setWorking(true);
    try {
      await updateCaseStatus(caseData.id, 'CLOSED');
      setActiveCaseId(null);
      Alert.alert(t('handoff_complete'), isAr ? 'تم تسليم الحالة' : 'Case handed off');
      nav.popToTop();
    } catch (e) {
      Alert.alert(t('close_case'), apiErrorMessage(e));
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!caseData) {
    return (
      <Screen>
        <View style={{ padding: 24, flex: 1, justifyContent: 'center' }}>
          <EmptyState title={t('no_active_case')} />
          <Spacer />
          <Button title={t('open_in_alerts')} onPress={() => nav.goBack()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        <Card
          style={{
            backgroundColor: colors.success + '15',
            borderColor: colors.success,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <View
            style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success }}
          />
          <View style={{ flex: 1 }}>
            <TextDim
              style={{
                color: colors.success,
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1,
              }}
            >
              {t('status_onscene').toUpperCase()}
            </TextDim>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
              {caseData.id.slice(0, 8)} · {caseData.address}
            </Text>
          </View>
          <Pill
            label={t(`sev_${caseData.severity.toLowerCase()}`)}
            color={severityColor(caseData.severity)}
          />
        </Card>

        <Spacer />
        <TextDim style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>
          {t('vitals').toUpperCase()}
        </TextDim>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
          <Vital label={t('hr')} unit="bpm" value={hr} onChange={setHr} />
          <Vital label={t('bp')} unit="mmHg" value={bp} onChange={setBp} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          <Vital label={t('spo2')} unit="%" value={spo2} onChange={setSpo2} />
          <Vital label={t('gcs')} unit="/15" value={gcs} onChange={setGcs} />
        </View>

        <TextDim style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>
          {t('actions_checklist').toUpperCase()}
        </TextDim>
        <View style={{ gap: 6 }}>
          {actionsList.map((a, i) => (
            <Pressable
              key={i}
              onPress={() => setActions((p) => p.map((v, idx) => (idx === i ? !v : v)))}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                padding: 12,
                borderRadius: 10,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: actions[i] ? colors.primary : colors.border,
                  backgroundColor: actions[i] ? colors.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {actions[i] ? (
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>
                ) : null}
              </View>
              <Text
                style={{
                  color: actions[i] ? colors.text : colors.textDim,
                  fontSize: 13,
                  fontWeight: '500',
                }}
              >
                {a}
              </Text>
            </Pressable>
          ))}
        </View>

        <Spacer />
        <Pressable
          onPress={() => setStabilized((v) => !v)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            padding: 14,
            borderRadius: 12,
            backgroundColor: stabilized ? colors.primary + '22' : colors.card,
            borderWidth: 1,
            borderColor: stabilized ? colors.primary : colors.border,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: stabilized ? colors.primary : colors.border,
              backgroundColor: stabilized ? colors.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {stabilized ? (
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>✓</Text>
            ) : null}
          </View>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>
            {t('stabilized')}
          </Text>
        </Pressable>

        <Spacer />
        <Button
          title={t('handoff')}
          size="lg"
          onPress={onHandoff}
          loading={working}
          disabled={!stabilized}
        />
      </ScrollView>
    </Screen>
  );
}

function Vital({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View
      style={{
        flex: 1,
        padding: 10,
        backgroundColor: colors.card,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <TextDim style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6 }}>
        {label.toUpperCase()}
      </TextDim>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="—"
          placeholderTextColor={colors.textDim}
          keyboardType="numeric"
          style={{
            flex: 1,
            fontSize: 18,
            fontWeight: '700',
            color: colors.text,
            paddingVertical: 0,
          }}
        />
        <Text style={{ color: colors.textDim, fontSize: 10 }}>{unit}</Text>
      </View>
    </View>
  );
}
