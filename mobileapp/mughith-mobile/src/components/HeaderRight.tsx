import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useStore } from '../store/useStore';
import { useI18n } from '../lib/i18n';
import { disconnectSockets } from '../lib/socket';
import { colors } from '../lib/theme';

export default function HeaderRight() {
  const { lang, setLang, t } = useI18n();
  const logout = useStore((s) => s.logout);

  const onSignOut = () => {
    Alert.alert(t('confirm_signout'), '', [
      { text: t('no'), style: 'cancel' },
      {
        text: t('yes'),
        style: 'destructive',
        onPress: () => {
          disconnectSockets();
          logout();
        },
      },
    ]);
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 }}>
      <Pressable
        onPress={() => setLang(lang === 'en' ? 'ar' : 'en')}
        style={{
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 999,
          backgroundColor: colors.bgElev,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 11 }}>
          {lang === 'en' ? 'AR' : 'EN'}
        </Text>
      </Pressable>
      <Pressable
        onPress={onSignOut}
        style={{
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 999,
          backgroundColor: colors.danger + '22',
          borderWidth: 1,
          borderColor: colors.danger,
        }}
      >
        <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 11 }}>
          {t('sign_out')}
        </Text>
      </Pressable>
    </View>
  );
}
