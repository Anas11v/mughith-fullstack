import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

import { Button, Card, Field, Screen, Spacer, TextDim } from '../../components/UI';
import { useI18n } from '../../lib/i18n';
import { register } from '../../lib/auth';
import { apiErrorMessage } from '../../lib/api';
import { useStore } from '../../store/useStore';
import { colors } from '../../lib/theme';
import type { RootStackParamList } from '../../navigation/RootNavigator';

export default function RegisterScreen() {
  const { t, isAr } = useI18n();
  const nav = useNavigation<NavigationProp<RootStackParamList>>();
  const setSession = useStore((s) => s.setSession);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError(t('name_required'));
      return;
    }
    if (password.length < 8) {
      setError(isAr ? 'كلمة المرور قصيرة (٨ خانات على الأقل)' : 'Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
      });
      setSession(res.user, res.accessToken);
    } catch (e) {
      const msg = apiErrorMessage(e, isAr ? 'فشل إنشاء الحساب' : 'Registration failed');
      setError(msg);
      Alert.alert(t('register_title'), msg);
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
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>
            {t('register_title')}
          </Text>
          <TextDim style={{ marginBottom: 16 }}>{t('register_sub')}</TextDim>
          <Card>
            <Field label={t('register_name')} value={name} onChangeText={setName} />
            <Field
              label={t('register_email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
            <Field
              label={t('register_phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+966500000000"
            />
            <Field
              label={t('register_password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={error}
            />
            <Button title={t('register_cta')} onPress={onSubmit} loading={loading} size="lg" />
            <Spacer />
            <Button
              variant="ghost"
              title={t('register_have_account')}
              onPress={() => nav.goBack()}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
