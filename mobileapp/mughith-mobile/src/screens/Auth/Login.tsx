import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

import { Button, Card, Field, Screen, Spacer, TextDim } from '../../components/UI';
import { useI18n } from '../../lib/i18n';
import { login } from '../../lib/auth';
import { apiErrorMessage } from '../../lib/api';
import { useStore } from '../../store/useStore';
import { colors } from '../../lib/theme';
import type { RootStackParamList } from '../../navigation/RootNavigator';

export default function LoginScreen() {
  const { t, lang, setLang, isAr } = useI18n();
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const setSession = useStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError(t('error_generic'));
      return;
    }
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      setSession(res.user, res.accessToken);
    } catch (e) {
      const msg = apiErrorMessage(e, isAr ? 'فشل تسجيل الدخول' : 'Sign-in failed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1, justifyContent: 'center' }}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                backgroundColor: colors.primary + '22',
                borderWidth: 2,
                borderColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
              }}
            >
              <Text style={{ color: colors.primary, fontSize: 28, fontWeight: '900' }}>M</Text>
            </View>
            <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900' }}>
              {t('brand')}
            </Text>
            <TextDim style={{ marginTop: 2, fontSize: 12 }}>{t('brandFull')}</TextDim>
            <TextDim style={{ marginTop: 2, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
              {t('brandTag')}
            </TextDim>
          </View>

          <Card>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 4 }}>
              {t('login_title')}
            </Text>
            <TextDim style={{ marginBottom: 14 }}>{t('login_sub')}</TextDim>
            <Field
              label={t('login_email')}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
            />
            <Field
              label={t('login_password')}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              error={error}
            />
            <Button
              size="lg"
              title={loading ? t('login_signing') : t('login_cta')}
              onPress={onSubmit}
              loading={loading}
            />
            <Spacer />
            <Button
              variant="ghost"
              title={t('login_register_cta')}
              onPress={() => nav.navigate('Register')}
            />
          </Card>

          <Spacer />
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            <Pressable
              onPress={() => setLang('en')}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: lang === 'en' ? colors.primary : colors.border,
                backgroundColor: lang === 'en' ? colors.primary + '22' : 'transparent',
              }}
            >
              <Text style={{ color: lang === 'en' ? colors.primary : colors.textDim, fontWeight: '700' }}>
                English
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setLang('ar')}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: lang === 'ar' ? colors.primary : colors.border,
                backgroundColor: lang === 'ar' ? colors.primary + '22' : 'transparent',
              }}
            >
              <Text style={{ color: lang === 'ar' ? colors.primary : colors.textDim, fontWeight: '700' }}>
                العربية
              </Text>
            </Pressable>
          </View>
          <Spacer />
          <TextDim style={{ textAlign: 'center', fontSize: 11, paddingHorizontal: 12 }}>
            {t('login_legal')}
          </TextDim>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
