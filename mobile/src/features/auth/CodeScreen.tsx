import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { api, errorMessage } from '../../api/client';
import type { Session, User } from '../../api/types';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { haptics } from '../../lib/haptics';
import type { AuthScreenProps } from '../../navigation/types';
import { useSession } from '../../store/session';
import { useTheme } from '../../theme';

const LENGTH = 6;
const RESEND_SECONDS = 30;

export function CodeScreen({ route }: AuthScreenProps<'Code'>) {
  const { email, devCode: initialDevCode } = route.params;
  const { colors, radius, spacing, fonts } = useTheme();
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState(initialDevCode);
  const [wait, setWait] = useState(RESEND_SECONDS);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const signIn = useSession(s => s.signIn);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait(w => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const verify = useMutation({
    mutationFn: (value: string) =>
      api<Session & { user: User }>('/auth/otp/verify', {
        method: 'POST',
        body: { email, code: value },
        auth: false,
      }),
    onSuccess: async ({ accessToken, refreshToken }) => {
      haptics.success();
      await signIn({ accessToken, refreshToken });
    },
    onError: () => {
      haptics.warning();
      setCode('');
    },
  });

  const resend = useMutation({
    mutationFn: () =>
      api<{ devCode?: string }>('/auth/otp/request', {
        method: 'POST',
        body: { email },
        auth: false,
      }),
    onSuccess: res => {
      setWait(RESEND_SECONDS);
      setDevCode(res.devCode);
    },
  });

  const onChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, LENGTH);
    setCode(digits);
    if (digits.length === LENGTH) verify.mutate(digits);
  };

  return (
    <Screen
      leading="back"
      title="Check your email"
      subtitle={`Enter the code we sent to ${email}.`}
      footer={
        <Button
          label="Continue"
          onPress={() => verify.mutate(code)}
          loading={verify.isPending}
          disabled={code.length < LENGTH}
        />
      }
    >
      <Pressable onPress={() => input.current?.focus()} accessible={false}>
        <View style={[styles.boxes, { gap: spacing.sm }]}>
          {Array.from({ length: LENGTH }, (_, i) => {
            const active = i === code.length && !verify.isPending;
            return (
              <View
                key={i}
                style={[
                  styles.box,
                  {
                    borderRadius: radius.md,
                    backgroundColor: colors.surface,
                    borderColor: verify.isError
                      ? colors.danger
                      : active
                      ? colors.primary
                      : colors.border,
                  },
                ]}
              >
                <AppText
                  style={{
                    fontFamily: fonts.semibold,
                    fontSize: 24,
                    lineHeight: 30,
                  }}
                  tabular
                >
                  {code[i] ?? ''}
                </AppText>
              </View>
            );
          })}
        </View>
      </Pressable>
      <TextInput
        ref={input}
        value={code}
        onChangeText={onChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus
        maxLength={LENGTH}
        accessibilityLabel="6-digit code"
        style={styles.hidden}
      />
      {verify.error ? (
        <AppText variant="caption" color="danger" accessibilityRole="alert">
          {errorMessage(verify.error)}
        </AppText>
      ) : null}

      <Button
        label={wait > 0 ? `Resend code in ${wait}s` : 'Resend code'}
        variant="ghost"
        compact
        disabled={wait > 0}
        loading={resend.isPending}
        onPress={() => resend.mutate()}
      />

      {devCode ? (
        <Pressable
          onPress={() => onChange(devCode)}
          accessibilityRole="button"
          style={[
            styles.dev,
            {
              borderColor: colors.reward,
              borderRadius: radius.md,
              padding: spacing.md,
            },
          ]}
        >
          <AppText variant="caption" color="reward">
            Development server: no email is sent. Your code is {devCode}. Tap to
            fill it in.
          </AppText>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  boxes: { flexDirection: 'row', justifyContent: 'space-between' },
  box: {
    flex: 1,
    aspectRatio: 0.85,
    maxHeight: 64,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  dev: { borderWidth: 1, borderStyle: 'dashed' },
});
