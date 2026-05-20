import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  type RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
  type NavigationProp,
} from '@react-navigation/native';
import MapView, { Marker } from 'react-native-maps';

import { Avatar, Button, Card, Field, Pill, Screen, SectionTitle, Spacer, TextDim } from '../../components/UI';
import { useI18n } from '../../lib/i18n';
import { closeCase, getCase, updateAmbulanceInfo, updateCaseStatus } from '../../lib/cases';
import { nearbyDonators } from '../../lib/dispatch';
import { apiErrorMessage } from '../../lib/api';
import { formatAgo } from '../../lib/time';
import { colors, severityColor, statusColor } from '../../lib/theme';
import type { EmergencyCase, NearbyDonator } from '../../types';
import type { RootStackParamList } from '../../navigation/RootNavigator';

export default function DispatcherCaseDetail() {
  const { t, num, tpl, isAr } = useI18n();
  const route = useRoute<RouteProp<RootStackParamList, 'CaseDetail'>>();
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const { id } = route.params;

  const [data, setData] = useState<EmergencyCase | null>(null);
  const [nearby, setNearby] = useState<NearbyDonator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClose, setShowClose] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [closing, setClosing] = useState(false);
  const [showAmb, setShowAmb] = useState(false);
  const [plate, setPlate] = useState('');
  const [eta, setEta] = useState('');
  const [crew, setCrew] = useState('');
  const [savingAmb, setSavingAmb] = useState(false);

  const load = useCallback(async () => {
    try {
      const c = await getCase(id);
      setData(c);
      setPlate(c.ambulancePlate ?? '');
      setEta(c.ambulanceEta ?? '');
      setCrew(c.ambulanceCrew ?? '');
      if (c.status === 'OPEN' || c.status === 'ASSIGNED') {
        try {
          const list = await nearbyDonators(id);
          setNearby(list);
        } catch {
          setNearby([]);
        }
      } else {
        setNearby([]);
      }
    } catch (e) {
      Alert.alert(t('error_generic'), apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  useEffect(() => {
    const i = setInterval(load, 15000);
    return () => clearInterval(i);
  }, [load]);

  const handleStatus = async (next: 'ON_SCENE') => {
    try {
      const u = await updateCaseStatus(id, next);
      setData(u);
    } catch (e) {
      Alert.alert(t('error_generic'), apiErrorMessage(e));
    }
  };

  const handleClose = async () => {
    if (!outcome.trim()) {
      Alert.alert(t('outcome'), t('outcome_required'));
      return;
    }
    setClosing(true);
    try {
      const u = await closeCase(id, outcome.trim());
      setData(u);
      setShowClose(false);
      setOutcome('');
      Alert.alert(t('closed_toast'));
    } catch (e) {
      Alert.alert(t('close_case'), apiErrorMessage(e));
    } finally {
      setClosing(false);
    }
  };

  const handleAmbulance = async () => {
    setSavingAmb(true);
    try {
      const u = await updateAmbulanceInfo(id, {
        plate: plate || undefined,
        eta: eta || undefined,
        crew: crew || undefined,
      });
      setData(u);
      setShowAmb(false);
      Alert.alert(t('ambulance_updated'));
    } catch (e) {
      Alert.alert(t('error_generic'), apiErrorMessage(e));
    } finally {
      setSavingAmb(false);
    }
  };

  if (loading && !data) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen>
        <View style={{ padding: 20 }}>
          <TextDim>{t('no_data')}</TextDim>
        </View>
      </Screen>
    );
  }

  const callReporter = () => {
    if (data.createdBy?.phone) Linking.openURL(`tel:${data.createdBy.phone}`);
    else if (data.createdBy?.email) Linking.openURL(`mailto:${data.createdBy.email}`);
  };

  const openInMaps = () => {
    const url = Platform.select({
      ios: `maps:0,0?q=${data.latitude},${data.longitude}`,
      android: `geo:0,0?q=${data.latitude},${data.longitude}`,
    });
    if (url) Linking.openURL(url);
  };

  const sev = severityColor(data.severity);
  const sta = statusColor(data.status);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          <TextDim style={{ fontSize: 11, fontFamily: 'Menlo' }}>{data.id.slice(0, 12)}</TextDim>
          <Pill label={t(`sev_${data.severity.toLowerCase()}`)} color={sev} />
          <Pill label={t(`status_${data.status.toLowerCase()}`)} color={sta} />
          {data.panicTriggered ? <Pill label="PANIC" color={colors.danger} /> : null}
        </View>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{data.address}</Text>
        <TextDim style={{ fontSize: 11, fontFamily: 'Menlo' }}>
          {data.latitude.toFixed(4)}° N, {data.longitude.toFixed(4)}° E · {t('opened')}{' '}
          {formatAgo(data.createdAt, t, tpl, num)}
        </TextDim>

        <Spacer />
        <View
          style={{
            height: 220,
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <MapView
            style={{ flex: 1 }}
            initialRegion={{
              latitude: data.latitude,
              longitude: data.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker
              coordinate={{ latitude: data.latitude, longitude: data.longitude }}
              pinColor={sev}
            />
            {nearby.map((d) => (
              <Marker
                key={d.id}
                coordinate={{ latitude: d.latitude, longitude: d.longitude }}
                title={d.name}
                pinColor={colors.success}
              />
            ))}
          </MapView>
        </View>

        <Spacer />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {data.createdBy?.phone ? (
            <Button
              size="sm"
              variant="secondary"
              title={t('call_reporter')}
              onPress={callReporter}
              style={{ flex: 1, minWidth: 140 }}
            />
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            title={t('open_in_maps')}
            onPress={openInMaps}
            style={{ flex: 1, minWidth: 140 }}
          />
        </View>
        <Spacer h={8} />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {data.status === 'ASSIGNED' ? (
            <Button
              size="sm"
              title={t('mark_on_scene')}
              onPress={() => handleStatus('ON_SCENE')}
              style={{ flex: 1, minWidth: 140 }}
            />
          ) : null}
          {data.status === 'ASSIGNED' || data.status === 'ON_SCENE' ? (
            <Button
              size="sm"
              variant="secondary"
              title={t('ambulance_info')}
              onPress={() => setShowAmb((v) => !v)}
              style={{ flex: 1, minWidth: 140 }}
            />
          ) : null}
          {data.status !== 'CLOSED' && data.status !== 'EXPIRED' ? (
            <Button
              size="sm"
              variant="danger"
              title={t('close_case')}
              onPress={() => setShowClose(true)}
              style={{ flex: 1, minWidth: 140 }}
            />
          ) : null}
        </View>

        {showAmb ? (
          <>
            <Spacer />
            <Card>
              <SectionTitle title={t('ambulance_info')} />
              <Field label={t('plate')} value={plate} onChangeText={setPlate} placeholder="ABC-1234" />
              <Field label={t('eta')} value={eta} onChangeText={setEta} placeholder="12 min" />
              <Field label={t('crew')} value={crew} onChangeText={setCrew} placeholder="Team Alpha" />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button title={t('save')} onPress={handleAmbulance} loading={savingAmb} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title={t('cancel')} variant="ghost" onPress={() => setShowAmb(false)} />
                </View>
              </View>
            </Card>
          </>
        ) : null}

        {showClose ? (
          <>
            <Spacer />
            <Card>
              <SectionTitle title={t('close_case')} />
              <Field
                value={outcome}
                onChangeText={setOutcome}
                placeholder={t('case_outcome_ph')}
                multiline
                numberOfLines={4}
                style={{ minHeight: 100, textAlignVertical: 'top' }}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    variant="danger"
                    title={t('close_case')}
                    onPress={handleClose}
                    loading={closing}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title={t('cancel')} variant="ghost" onPress={() => setShowClose(false)} />
                </View>
              </View>
            </Card>
          </>
        ) : null}

        <Spacer />
        <Card>
          <SectionTitle title={t('details')} />
          <DetailRow label={t('addr_label')} value={data.address} />
          <DetailRow label={t('patient_condition')} value={data.notes ?? '—'} />
          {data.outcome ? <DetailRow label={t('outcome')} value={data.outcome} /> : null}
          {data.ambulancePlate || data.ambulanceEta || data.ambulanceCrew ? (
            <DetailRow
              label={t('ambulance')}
              value={
                [data.ambulancePlate, data.ambulanceEta, data.ambulanceCrew]
                  .filter(Boolean)
                  .join(' · ') || '—'
              }
            />
          ) : null}
          {data.assignedTo ? (
            <View style={{ paddingVertical: 8, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Avatar name={data.assignedTo.name} size={36} />
              <View>
                <TextDim style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6 }}>
                  {t('responder').toUpperCase()}
                </TextDim>
                <Text style={{ color: colors.text, fontWeight: '700' }}>
                  {data.assignedTo.name}
                </Text>
              </View>
            </View>
          ) : null}
        </Card>

        <Spacer />
        <Card>
          <SectionTitle title={t('timeline')} />
          <TimelineRow
            label={t('case_created')}
            by={data.createdBy?.name}
            time={formatAgo(data.createdAt, t, tpl, num)}
            active
            first
          />
          {data.assignedTo ? (
            <TimelineRow label={t('volunteer_assigned')} by={data.assignedTo.name} active />
          ) : null}
          {data.status === 'ON_SCENE' || data.closedAt ? (
            <TimelineRow label={t('status_onscene')} active />
          ) : null}
          {data.ambulanceEta ? (
            <TimelineRow label={`${t('ambulance_eta')}: ${data.ambulanceEta}`} active />
          ) : null}
          {data.closedAt ? (
            <TimelineRow label={t('status_closed')} by={data.outcome ?? undefined} active last />
          ) : null}
        </Card>

        <Spacer />
        <Card>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14 }}>
              {t('matched_volunteers')}
            </Text>
            <Pill label={num(nearby.length)} color={colors.primary} />
          </View>
          {nearby.length === 0 ? (
            <TextDim style={{ textAlign: 'center', padding: 12 }}>
              {data.status === 'CLOSED' || data.status === 'EXPIRED'
                ? t('no_data')
                : isAr
                ? 'لا يوجد متطوعون قريبون.'
                : 'No nearby volunteers.'}
            </TextDim>
          ) : (
            nearby.map((v, i) => (
              <View
                key={v.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 10,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                  backgroundColor:
                    data.assignedToId === v.id ? colors.primary + '15' : 'transparent',
                }}
              >
                <Avatar name={v.name} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{v.name}</Text>
                  <TextDim style={{ fontSize: 11 }}>
                    {tpl('dist_away', { d: num(v.distanceKm.toFixed(1)) })} ·{' '}
                    {tpl('eta_min', { m: num(Math.round(v.etaMinutes)) })}
                  </TextDim>
                </View>
                {data.assignedToId === v.id ? (
                  <Pill label={t('accepted')} color={colors.success} />
                ) : (
                  <Pill label={t('pending')} color={colors.textDim} />
                )}
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ paddingVertical: 8 }}>
      <TextDim style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.6 }}>
        {label.toUpperCase()}
      </TextDim>
      <Text style={{ color: colors.text, fontSize: 14, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function TimelineRow({
  label,
  by,
  time,
  active,
  first,
  last,
}: {
  label: string;
  by?: string | null;
  time?: string;
  active?: boolean;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: last ? 0 : 14 }}>
      <View style={{ alignItems: 'center', width: 16 }}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: active ? colors.primary : colors.bgElev,
            borderWidth: 2,
            borderColor: active ? colors.primary : colors.border,
            marginTop: 4,
          }}
        />
        {!last ? (
          <View
            style={{
              flex: 1,
              width: 2,
              backgroundColor: active ? colors.primary + '66' : colors.border,
              marginTop: 2,
              minHeight: 16,
            }}
          />
        ) : null}
      </View>
      <View style={{ flex: 1, paddingBottom: 4 }}>
        <Text
          style={{
            color: active ? colors.text : colors.textDim,
            fontWeight: active ? '700' : '500',
            fontSize: 13,
          }}
        >
          {label}
        </Text>
        {by || time ? (
          <TextDim style={{ fontSize: 11, marginTop: 2 }}>
            {[by, time].filter(Boolean).join(' · ')}
          </TextDim>
        ) : null}
      </View>
    </View>
  );
}
