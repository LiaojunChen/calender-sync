// ============================================================
// LoginScreen – email + password login / sign-up
// ============================================================

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LoginScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const { signIn, signUp, error, clearError, status } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Input focus states for focus ring
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const isLoading = status === 'loading' || submitting;

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('提示', '请填写邮箱和密码');
      return;
    }

    setSubmitting(true);
    clearError();

    try {
      if (isSignUp) {
        const ok = await signUp(email.trim(), password, displayName.trim() || undefined);
        if (ok) {
          Alert.alert('注册成功', '请查收验证邮件后登录。');
          setIsSignUp(false);
        }
      } else {
        await signIn(email.trim(), password);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const styles = makeStyles(colors);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Card wrapper */}
        <View style={styles.card}>
          {/* Logo / title */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>日</Text>
            </View>
            <Text style={styles.appName}>Project Calendar</Text>
            <Text style={styles.subtitle}>
              {isSignUp ? '创建账号' : '登录您的账号'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {isSignUp && (
              <TextInput
                style={[
                  styles.input,
                  { borderColor: focusedField === 'displayName' ? colors.primary : colors.border },
                ]}
                placeholder="显示名称（可选）"
                placeholderTextColor={colors.textTertiary}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="none"
                onFocus={() => setFocusedField('displayName')}
                onBlur={() => setFocusedField(null)}
              />
            )}

            <TextInput
              style={[
                styles.input,
                { borderColor: focusedField === 'email' ? colors.primary : colors.border },
              ]}
              placeholder="邮箱"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />

            <TextInput
              style={[
                styles.input,
                { borderColor: focusedField === 'password' ? colors.primary : colors.border },
              ]}
              placeholder="密码"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={() => void handleSubmit()}
              disabled={isLoading}
            >
              {({ pressed }) => (
                <View style={pressed ? styles.buttonInnerPressed : undefined}>
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {isSignUp ? '注册' : '登录'}
                    </Text>
                  )}
                </View>
              )}
            </Pressable>

            <Pressable
              style={styles.switchButton}
              onPress={() => {
                clearError();
                setIsSignUp((v) => !v);
              }}
            >
              <Text style={styles.switchText}>
                {isSignUp
                  ? '已有账号？点此登录'
                  : '没有账号？点此注册'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

type Colors = ReturnType<typeof useTheme>['colors'];

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    inner: {
      flex: 1,
      paddingHorizontal: 24,
      justifyContent: 'center',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 32,
      // Shadow (md)
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    header: {
      alignItems: 'center',
      marginBottom: 28,
    },
    logoCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    logoText: {
      color: '#ffffff',
      fontSize: 32,
      fontWeight: 'bold',
    },
    appName: {
      fontSize: 26,
      fontWeight: '700',
      letterSpacing: -0.5,
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    form: {
      gap: 12,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 16,
      height: 44,
      fontSize: 16,
      color: colors.text,
    },
    errorText: {
      color: colors.danger,
      fontSize: 13,
      textAlign: 'center',
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    buttonInnerPressed: {
      transform: [{ scale: 0.98 }],
    },
    buttonPressed: {
      opacity: 0.88,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    switchButton: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    switchText: {
      color: colors.primary,
      fontSize: 14,
    },
  });
}
