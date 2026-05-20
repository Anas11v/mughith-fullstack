import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

import { Button, Card, EmptyState, Pill, Screen, Spacer, TextDim } from '../../components/UI';
import { useI18n } from '../../lib/i18n';
import { useStore } from '../../store/useStore';
import { getCase, triggerPanic } from '../../lib/cases';
import { apiErrorMessage } from '../../lib/api';
import { getLocationSocket } from '../../lib/socket';
import { haversineKm } from '../../lib/geo';
import { colors, severityColor, statusColor } from '../../lib/theme';
import type { EmergencyCase } from '../../types';
import type { RootStackParamList } from '../../navigation/RootNavigator';

export default function VolunteerNavigate() {
  const { t, isAr, num } = useI18n();
  const route = useRoute<RouteProp<RootStackParamList, 'VolunteerNavigate'>>();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const activeCaseId = useStore((s) => s.activeCaseId);
  const setActiveCaseId = useStore((s) => s.setActiveCaseId);

  const targetId = route.params?.caseId ?? activeCaseId ?? null;

  const [caseData, setCaseData] = useState<EmergencyCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const load = useCallback(async () => {
    if (!targetId) {
      setCaseData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const c = await getCase(targetId);
      if (c.status === 'CLOSED' || c.status === 'EXPIRED') {
        setActiveCaseId(null);
        setCaseData(null);
      } else {
        setCaseData(c);
      }
    } catch (e) {
      Alert.alert(t('error_generic'), apiErrorMessage(e));
      setCaseData(null);
    } finally {
      setLoading(false);
    }
  }, [targetId, setActiveCaseId, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!caseData) return;
    const socket = getLocationSocket();
    socket.emit('location:subscribe', { caseId: caseData.id });

    let mounted = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permission_denied'), t('location_perm_needed'));
        return;
      }
      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 5000 },
        (loc) => {
          if (!mounted) return;
          const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setCoords(c);
          socket.emit(
            'location:update',
            { caseId: caseData.id, latitude: c.latitude, longitude: c.longitude },
            (ack?: { ok?: boolean; distanceKm?: number; etaMinutes?: number }) => {
              if (ack?.ok) {
                if (ack.distanceKm != null) setDistance(ack.distanceKm);
                if (ack.etaMinutes != null) setEta(ack.etaMinutes);
              }
            },
          );
        },
      );
    })();

    return () => {
      mounted = false;
      socket.emit('location:unsubscribe', { caseId: caseData.id });
      watchRef.current?.remove();
    };
  }, [caseData, t]);

  const fallbackDist = useMemo(() => {
    if (!coords || !caseData) return null;
    return haversineKm(coords, { latitude: caseData.latitude, longitude: caseData.longitude });
  }, [coords, caseData]);

  const onArrived = () => {
    if (caseData) nav.replace('VolunteerOnScene', { caseId: caseData.id });
  };

  const onPanic = async () => {
    if (!caseData) return;
    Alert.alert(t('panic'), '', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('panic'),
        style: 'destructive',
        onPress: async () => {
          try {
            await triggerPanic(caseData.id);
            Alert.alert(t('panic'), t('panic_sent'));
          } catch (e) {
            Alert.alert(t('panic'), apiErrorMessage(e));
          }
        },
      },
    ]);
  };

  const openExternalMaps = () => {
    if (!caseData) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${caseData.latitude},${caseData.longitude}`,
      android: `geo:0,0?q=${caseData.latitude},${caseData.longitude}`,
    });
    if (url) Linking.openURL(url);
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
          <EmptyState
            title={t('no_active_case')}
            subtitle={
              isAr
                ? 'لا توجد حالة موكلة إليك حاليًا. افتح التنبيهات لقبول حالة جديدة.'
                : 'You do not have a case assigned. Open alerts to accept one.'
            }
          />
          <Spacer />
          <Button title={t('open_in_alerts')} onPress={() => nav.goBack()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: caseData.latitude,
            longitude: caseData.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation
          showsMyLocationButton
        >
          <Marker
            coordinate={{ latitude: caseData.latitude, longitude: caseData.longitude }}
            title={caseData.address}
            description={t(`sev_${caseData.severity.toLowerCase()}`)}
            pinColor={severityColor(caseData.severity)}
          />
          {coords ? <Marker coordinate={coords} title="You" pinColor={colors.primary} /> : null}
        </MapView>

        <ScrollView
          style={{ maxHeight: 380 }}
          contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
        >
          <Card>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              <Pill
                label={t(`sev_${caseData.severity.toLowerCase()}`)}
                color={severityColor(caseData.severity)}
              />
              <Pill
                label={t(`status_${caseData.status.toLowerCase()}`)}
                color={statusColor(caseData.status)}
              />
            </View>
            <TextDim style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>
              {t('headed_to').toUpperCase()}
            </TextDim>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 2 }}>
              {caseData.address}
            </Text>
          </Card>

          <View style={{ flexDirection: 'row', gap: 8, marginVertical: 10 }}>
            <BigStat label={t('eta')} value={eta != null ? num(Math.round(eta)) : '—'} unit="min" />
            <BigStat
              label={t('distance')}
              value={
                distance != null
                  ? num(distance.toFixed(1))
                  : fallbackDist != null
                  ? num(fallbackDist.toFixed(1))
                  : '—'
              }
              unit="km"
            />
            <BigStat
              label={t('ambulance')}
              value={caseData.ambulanceEta ?? '—'}
              unit=""
              muted
            />
          </View>

          <Button title={t('open_in_maps')} variant="secondary" onPress={openExternalMaps} />
          <Spacer h={8} />
          <Button title={t('arrived')} size="lg" onPress={onArrived} />
          <Spacer h={8} />
          <Button title={t('panic')} variant="danger" onPress={onPanic} />
        </ScrollView>
      </View>
    </Screen>
  );
}

function BigStat({
  label,
  value,
  unit,
  muted,
}: {
  label: string;
  value: string;
  unit: string;
  muted?: boolean;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
      }}
    >
      <TextDim style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8 }}>
        {label.toUpperCase()}
      </TextDim>
      <Text
        style={{
          color: muted ? colors.textDim : colors.text,
          fontSize: 22,
          fontWeight: '800',
          marginTop: 2,
        }}
      >
        {value}
        {unit ? (
          <Text style={{ fontSize: 11, color: colors.textDim, fontWeight: '500' }}> {unit}</Text>
        ) : null}
      </Text>
    </View>
  );
}
