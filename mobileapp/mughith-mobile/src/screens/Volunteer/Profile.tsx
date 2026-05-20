import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { Avatar, Button, Card, Field, Pill, Screen, Spacer, TextDim } from '../../components/UI';
import { useI18n } from '../../lib/i18n';
import { useStore } from '../../store/useStore';
import { setAvailability, updateProfile } from '../../lib/users';
import { apiErrorMessage } from '../../lib/api';
import { colors } from '../../lib/theme';

export default function VolunteerProfile() {
  const { t, isAr, lang, setLang } = useI18n();
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [certification, setCertification] = useState(user?.certification ?? '');
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  if (!user) return null;

  const onSave = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile({
        name: name.trim() || undefined,
        phone: phone.trim() || null,
        certification: certification.trim() || null,
      });
      setUser(updated);
      Alert.alert(t('saved'));
    } catch (e) {
      Alert.alert(t('error_generic'), apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async (val: boolean) => {
    setToggling(true);
    try {
      const updated = await setAvailability(val);
      setUser(updated);
    } catch (e) {
      Alert.alert(t('error_generic'), apiErrorMessage(e));
    } finally {
      setToggling(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        <Card style={{ alignItems: 'center', padding: 22 }}>
          <Avatar name={user.name} size={72} />
          <Text style={{ color: colors.text, fontSize: 19, fontWeight: '800', marginTop: 10 }}>
            {user.name}
          </Text>
          <TextDim style={{ fontSize: 12 }}>
            {user.certification ?? t('certified')} · {user.email}
          </TextDim>
          <View style={{ marginTop: 8 }}>
            {user.isVerified ? (
              <Pill label={t('verified')} color={colors.success} />
            ) : (
              <Pill label={t('not_verified')} color={colors.warning} />
            )}
          </View>
        </Card>

        <Card>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {t('toggle_availability')}
              </Text>
              <TextDim style={{ fontSize: 11 }}>
                {isAr ? 'استقبال التنبيهات الفورية' : 'Receive live alerts'}
              </TextDim>
            </View>
            <Switch
              value={user.isAvailable}
              onValueChange={onToggle}
              disabled={toggling}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
            />
          </View>
        </Card>

        <Card>
          <Field label={t('register_name')} value={name} onChangeText={setName} />
          <Field
            label={t('register_phone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Field
            label={t('certification')}
            value={certification}
            onChangeText={setCertification}
            placeholder="BLS, ACLS, PHTLS"
          />
          <Button title={t('save')} onPress={onSave} loading={saving} />
        </Card>

        <Card>
          <TextDim style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 }}>
            {t('settings_lang').toUpperCase()}
          </TextDim>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={() => setLang('en')}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: lang === 'en' ? colors.primary : colors.border,
                backgroundColor: lang === 'en' ? colors.primary + '22' : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: lang === 'en' ? colors.primary : colors.textDim, fontWeight: '700' }}>
                English
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setLang('ar')}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: lang === 'ar' ? colors.primary : colors.border,
                backgroundColor: lang === 'ar' ? colors.primary + '22' : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: lang === 'ar' ? colors.primary : colors.textDim, fontWeight: '700' }}>
                العربية
              </Text>
            </Pressable>
          </View>
        </Card>
        <Spacer />
      </ScrollView>
    </Screen>
  );
}
