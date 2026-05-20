import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, severityColor, statusColor } from '../lib/theme';

export const Screen: React.FC<React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>> = ({
  children,
  style,
}) => (
  <SafeAreaView style={[styles.screen, style]} edges={['left', 'right']}>
    {children}
  </SafeAreaView>
);

export const Card: React.FC<
  React.PropsWithChildren<{ style?: StyleProp<ViewStyle>; padded?: boolean }>
> = ({ children, style, padded = true }) => (
  <View style={[styles.card, padded ? { padding: 14 } : null, style]}>{children}</View>
);

export const SectionTitle: React.FC<{ title: string; subtitle?: string }> = ({
  title,
  subtitle,
}) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>{title}</Text>
    {subtitle ? (
      <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>
    ) : null}
  </View>
);

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  loading,
  variant = 'primary',
  disabled,
  style,
  size = 'md',
}) => {
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'success'
      ? colors.success
      : variant === 'danger'
      ? colors.danger
      : variant === 'secondary'
      ? colors.bgElev
      : 'transparent';
  const txt = variant === 'ghost' || variant === 'outline' ? colors.primary : '#fff';
  const borderColor =
    variant === 'outline'
      ? colors.primary
      : variant === 'secondary'
      ? colors.border
      : 'transparent';
  const minHeight = size === 'sm' ? 36 : size === 'lg' ? 52 : 46;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 15;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          minHeight,
          borderWidth: variant === 'outline' || variant === 'secondary' ? 1 : 0,
          borderColor,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={txt} />
      ) : (
        <Text style={[styles.buttonText, { color: txt, fontSize }]}>{title}</Text>
      )}
    </Pressable>
  );
};

interface FieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
}

export const Field: React.FC<FieldProps> = ({ label, error, style, ...rest }) => (
  <View style={{ marginBottom: 12 }}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TextInput
      placeholderTextColor={colors.textDim}
      style={[styles.input, !!error && { borderColor: colors.danger }, style]}
      {...rest}
    />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

export const Pill: React.FC<{ label: string; color: string; style?: StyleProp<ViewStyle> }> = ({
  label,
  color,
  style,
}) => (
  <View style={[styles.pill, { backgroundColor: color + '22', borderColor: color }, style]}>
    <Text style={[styles.pillText, { color }]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

export const SeverityPill: React.FC<{ level: string; label: string }> = ({ level, label }) => (
  <Pill label={label} color={severityColor(level)} />
);

export const StatusPill: React.FC<{ status: string; label: string }> = ({ status, label }) => (
  <Pill label={label} color={statusColor(status)} />
);

export const Spacer: React.FC<{ h?: number }> = ({ h = 12 }) => <View style={{ height: h }} />;

export const Center: React.FC<React.PropsWithChildren> = ({ children }) => (
  <View style={styles.center}>{children}</View>
);

export const TextDim: React.FC<React.PropsWithChildren<TextProps>> = ({
  children,
  style,
  ...rest
}) => (
  <Text style={[{ color: colors.textDim }, style]} {...rest}>
    {children}
  </Text>
);

export const Avatar: React.FC<{ name?: string | null; size?: number }> = ({ name, size = 36 }) => {
  const initials = (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primary + '33',
        borderWidth: 1,
        borderColor: colors.primary + '55',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: size * 0.4 }}>
        {initials || '?'}
      </Text>
    </View>
  );
};

export const StatCard: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}> = ({ label, value, sub, color }) => (
  <View
    style={{
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      borderLeftWidth: 4,
      borderLeftColor: color ?? colors.primary,
      borderWidth: 1,
      borderColor: colors.border,
    }}
  >
    <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>{value}</Text>
    <TextDim style={{ fontSize: 11, marginTop: 2 }}>{label}</TextDim>
    {sub ? <TextDim style={{ fontSize: 10, marginTop: 2 }}>{sub}</TextDim> : null}
  </View>
);

export const EmptyState: React.FC<{ title: string; subtitle?: string }> = ({
  title,
  subtitle,
}) => (
  <Card style={{ padding: 24, alignItems: 'center' }}>
    <Text style={{ fontSize: 28, color: colors.textDim, marginBottom: 6 }}>—</Text>
    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{title}</Text>
    {subtitle ? (
      <TextDim style={{ marginTop: 4, textAlign: 'center', fontSize: 12 }}>{subtitle}</TextDim>
    ) : null}
  </Card>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonText: {
    fontWeight: '700',
  },
  label: {
    color: colors.textDim,
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.bgElev,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
  },
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
