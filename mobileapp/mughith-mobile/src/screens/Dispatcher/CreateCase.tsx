import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

import { Button, Card, Field, Pill, Screen, SectionTitle, Spacer, TextDim } from '../../components/UI';
import { useI18n } from '../../lib/i18n';
import { createCase } from '../../lib/cases';
import { listDonators } from '../../lib/users';
import { donatorState, haversineKm, MAKKAH_CENTER } from '../../lib/geo';
import { apiErrorMessage } from '../../lib/api';
import { colors, severityColor } from '../../lib/theme';
import type { SeverityLevel, User } from '../../types';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Sex = 'male' | 'female' | 'unknown';

export default function CreateCase() {
  const { t, isAr, num, tpl } = useI18n();
  const nav = useNavigation<NavigationProp<RootStackParamList>>();

  const [step, setStep] = useState(1);
  const [addr, setAddr] = useState('');
  const [lat, setLat] = useState<number>(MAKKAH_CENTER.latitude);
  const [lng, setLng] = useState<number>(MAKKAH_CENTER.longitude);
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [condition, setCondition] = useState('');
  const [contact, setContact] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>('CRITICAL');
  const [radius, setRadius] = useState(5);
  const [dispatching, setDispatching] = useState(false);
  const [donators, setDonators] = useState<User[]>([]);

  useEffect(() => {
    listDonators({ page: 1, limit: 100, available: true })
      .then((r) => setDonators(r.data))
      .catch(() => {});
  }, []);

  const eligible = donators.filter(
    (d) => donatorState(d) === 'AVAILABLE' && d.latitude != null && d.longitude != null,
  );
  const inRange = eligible.filter(
    (d) =>
      haversineKm(
        { latitude: lat, longitude: lng },
        { latitude: d.latitude!, longitude: d.longitude! },
      ) <= radius,
  ).length;

  const buildNotes = () => {
    const parts: string[] = [];
    if (condition.trim()) parts.push(condition.trim());
    const meta: string[] = [];
    if (age) meta.push(`age:${age}`);
    if (sex) meta.push(`sex:${sex}`);
    if (contact) meta.push(`contact:${contact}`);
    if (meta.length) parts.push(`[${meta.join(' · ')}]`);
    return parts.join(' — ');
  };

  const useMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('use_my_location'), t('permission_denied'));
      return;
    }
    const pos = await Location.getCurrentPositionAsync({});
    setLat(pos.coords.latitude);
    setLng(pos.coords.longitude);
  };

  const reset = () => {
    setStep(1);
    setAddr('');
    setLat(MAKKAH_CENTER.latitude);
    setLng(MAKKAH_CENTER.longitude);
    setAge('');
    setSex('male');
    setCondition('');
    setContact('');
    setSeverity('CRITICAL');
    setRadius(5);
  };

  const doDispatch = async () => {
    if (!addr.trim()) {
      Alert.alert(t('addr_label'), t('address_required'));
      setStep(1);
      return;
    }
    if (!condition.trim()) {
      Alert.alert(t('patient_condition'), t('condition_required'));
      setStep(2);
      return;
    }
    setDispatching(true);
    try {
      const created = await createCase({
        address: addr.trim(),
        severity,
        notes: buildNotes(),
        radiusKm: radius,
        latitude: lat,
        longitude: lng,
      });
      reset();
      nav.navigate('CaseDetail', { id: created.id });
    } catch (e) {
      Alert.alert(t('dispatch'), apiErrorMessage(e));
    } finally {
      setDispatching(false);
    }
  };

  const steps = [
    { k: 1, label: t('step_location') },
    { k: 2, label: t('step_patient') },
    { k: 3, label: t('step_severity') },
    { k: 4, label: t('step_review') },
  ];

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>
            {t('new_title')}
          </Text>
          <TextDim style={{ fontSize: 12, marginBottom: 12 }}>{t('new_sub')}</TextDim>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 12,
              backgroundColor: colors.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: 10,
            }}
          >
            {steps.map((s, i) => (
              <React.Fragment key={s.k}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: step >= s.k ? colors.primary : colors.bgElev,
                    borderWidth: 1,
                    borderColor: step >= s.k ? colors.primary : colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: step >= s.k ? '#fff' : colors.textDim,
                      fontWeight: '800',
                      fontSize: 12,
                    }}
                  >
                    {step > s.k ? '✓' : num(s.k)}
                  </Text>
                </View>
                {i < steps.length - 1 ? (
                  <View
                    style={{
                      flex: 1,
                      height: 2,
                      backgroundColor: step > s.k ? colors.primary : colors.border,
                      marginHorizontal: 6,
                    }}
                  />
                ) : null}
              </React.Fragment>
            ))}
          </View>
          <TextDim style={{ textAlign: 'center', fontSize: 12, marginBottom: 10 }}>
            {steps[step - 1].label}
          </TextDim>

          {step === 1 ? (
            <Card>
              <SectionTitle
                title={t('step_location')}
                subtitle={isAr ? 'اكتب العنوان وحدد الموقع' : 'Type address and pick the location'}
              />
              <Field
                label={`${t('addr_label')} *`}
                value={addr}
                onChangeText={setAddr}
                placeholder={t('addr_ph')}
              />
              <View
                style={{
                  height: 220,
                  borderRadius: 12,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 10,
                }}
              >
                <MapView
                  style={{ flex: 1 }}
                  region={{
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                  onPress={(e) => {
                    setLat(e.nativeEvent.coordinate.latitude);
                    setLng(e.nativeEvent.coordinate.longitude);
                  }}
                >
                  <Marker
                    coordinate={{ latitude: lat, longitude: lng }}
                    pinColor={severityColor(severity)}
                  />
                  {eligible.map((d) => (
                    <Marker
                      key={d.id}
                      coordinate={{ latitude: d.latitude!, longitude: d.longitude! }}
                      pinColor={colors.success}
                    />
                  ))}
                </MapView>
              </View>
              <TextDim style={{ fontSize: 11, marginBottom: 8 }}>
                {t('location_picker_hint')}
              </TextDim>
              <View
                style={{
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: inRange > 0 ? colors.success + '22' : colors.danger + '22',
                  borderWidth: 1,
                  borderColor: inRange > 0 ? colors.success : colors.danger,
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    color: inRange > 0 ? colors.success : colors.danger,
                    fontSize: 12,
                    fontWeight: '700',
                  }}
                >
                  {inRange > 0
                    ? tpl('inside_zone', { n: num(inRange), r: num(radius) })
                    : t('outside_zone')}
                </Text>
              </View>
              <Button
                variant="secondary"
                size="sm"
                title={t('use_my_location')}
                onPress={useMyLocation}
              />
              <Spacer h={6} />
              <TextDim style={{ fontSize: 11, fontFamily: 'Menlo' }}>
                {lat.toFixed(5)}° N, {lng.toFixed(5)}° E
              </TextDim>
            </Card>
          ) : null}

          {step === 2 ? (
            <Card>
              <SectionTitle title={t('step_patient')} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label={t('patient_age')}
                    value={age}
                    onChangeText={setAge}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textDim, fontSize: 13, marginBottom: 6 }}>
                    {t('patient_sex')}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {(['male', 'female', 'unknown'] as Sex[]).map((s) => (
                      <Pressable
                        key={s}
                        onPress={() => setSex(s)}
                        style={{
                          flex: 1,
                          paddingVertical: 11,
                          borderRadius: 8,
                          backgroundColor: sex === s ? colors.primary + '22' : colors.bgElev,
                          borderWidth: 1,
                          borderColor: sex === s ? colors.primary : colors.border,
                          alignItems: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: sex === s ? colors.primary : colors.text,
                            fontSize: 11,
                            fontWeight: '700',
                          }}
                        >
                          {s === 'male'
                            ? t('patient_male')
                            : s === 'female'
                            ? t('patient_female')
                            : t('patient_unknown')}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
              <Field
                label={`${t('patient_condition')} *`}
                value={condition}
                onChangeText={setCondition}
                placeholder={t('patient_condition_ph')}
                multiline
                numberOfLines={3}
                style={{ minHeight: 80, textAlignVertical: 'top' }}
              />
              <Field
                label={t('patient_contact')}
                value={contact}
                onChangeText={setContact}
                placeholder="+966 5X XXX XXXX"
                keyboardType="phone-pad"
              />
            </Card>
          ) : null}

          {step === 3 ? (
            <Card>
              <SectionTitle title={t('step_severity')} />
              {(
                [
                  { k: 'CRITICAL', desc: t('sev_critical_desc') },
                  { k: 'HIGH', desc: t('sev_serious_desc') },
                  { k: 'MODERATE', desc: t('sev_moderate_desc') },
                  { k: 'LOW', desc: t('sev_low_desc') },
                ] as { k: SeverityLevel; desc: string }[]
              ).map((o) => {
                const c = severityColor(o.k);
                const selected = severity === o.k;
                return (
                  <Pressable
                    key={o.k}
                    onPress={() => setSeverity(o.k)}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      backgroundColor: selected ? c + '15' : colors.bgElev,
                      borderWidth: 1.5,
                      borderColor: selected ? c : colors.border,
                      marginBottom: 8,
                      flexDirection: 'row',
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        borderWidth: 2,
                        borderColor: selected ? c : colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 2,
                      }}
                    >
                      {selected ? (
                        <View
                          style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }}
                        />
                      ) : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c, fontSize: 14, fontWeight: '800' }}>
                        {t(`sev_${o.k.toLowerCase()}`)}
                      </Text>
                      <TextDim style={{ fontSize: 12, marginTop: 2 }}>{o.desc}</TextDim>
                    </View>
                  </Pressable>
                );
              })}
              <Spacer />
              <Text style={{ color: colors.textDim, fontSize: 13, marginBottom: 6 }}>
                {t('radius_label')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Button
                  size="sm"
                  variant="secondary"
                  title="−"
                  onPress={() => setRadius(Math.max(0.5, radius - 0.5))}
                  style={{ width: 50 }}
                />
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: '800',
                    minWidth: 80,
                    textAlign: 'center',
                  }}
                >
                  {num(radius)} km
                </Text>
                <Button
                  size="sm"
                  variant="secondary"
                  title="+"
                  onPress={() => setRadius(Math.min(20, radius + 0.5))}
                  style={{ width: 50 }}
                />
              </View>
              <TextDim style={{ fontSize: 11, marginTop: 6 }}>
                {inRange > 0
                  ? tpl('inside_zone', { n: num(inRange), r: num(radius) })
                  : t('outside_zone')}
              </TextDim>
            </Card>
          ) : null}

          {step === 4 ? (
            <Card>
              <SectionTitle title={t('review_title')} subtitle={t('review_warn')} />
              <ReviewRow label={t('addr_label')} value={addr || '—'} />
              <ReviewRow
                label={t('lat_lng')}
                value={`${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`}
                mono
              />
              <ReviewRow
                label={t('patient_age')}
                value={
                  age
                    ? `${num(age)} · ${
                        sex === 'male'
                          ? t('patient_male')
                          : sex === 'female'
                          ? t('patient_female')
                          : t('patient_unknown')
                      }`
                    : '—'
                }
              />
              <ReviewRow label={t('patient_condition')} value={condition || '—'} />
              <View style={{ paddingVertical: 10 }}>
                <TextDim style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6 }}>
                  {t('severity').toUpperCase()}
                </TextDim>
                <View style={{ marginTop: 4 }}>
                  <Pill
                    label={t(`sev_${severity.toLowerCase()}`)}
                    color={severityColor(severity)}
                  />
                </View>
              </View>
              <ReviewRow label={t('radius_label')} value={`${num(radius)} km`} mono />
              <ReviewRow label={t('patient_contact')} value={contact || '—'} last />
            </Card>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <View style={{ flex: 1 }}>
              <Button
                variant="ghost"
                title={step === 1 ? t('cancel') : t('back')}
                onPress={() => (step === 1 ? reset() : setStep(step - 1))}
              />
            </View>
            <View style={{ flex: 1 }}>
              {step < 4 ? (
                <Button
                  title={t('next')}
                  onPress={() => {
                    if (step === 1 && !addr.trim()) {
                      Alert.alert(t('addr_label'), t('address_required'));
                      return;
                    }
                    if (step === 2 && !condition.trim()) {
                      Alert.alert(t('patient_condition'), t('condition_required'));
                      return;
                    }
                    setStep(step + 1);
                  }}
                />
              ) : (
                <Button
                  variant="danger"
                  title={dispatching ? t('dispatching') : t('dispatch')}
                  onPress={doDispatch}
                  loading={dispatching}
                />
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function ReviewRow({
  label,
  value,
  mono,
  last,
}: {
  label: string;
  value: string;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={{
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <TextDim style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6 }}>
        {label.toUpperCase()}
      </TextDim>
      <Text
        style={{
          color: colors.text,
          fontSize: 14,
          fontWeight: '600',
          marginTop: 2,
          fontFamily: mono ? 'Menlo' : undefined,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
