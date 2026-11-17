import { useMutation } from '@tanstack/react-query';
import { Mail } from 'lucide-react-native';
import { useState } from 'react';
import { api, errorMessage } from '../../api/client';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import type { AuthScreenProps } from '../../navigation/types';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailScreen({ navigation }: AuthScreenProps<'Email'>) {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const valid = EMAIL.test(email.trim());

  const request = useMutation({
    mutationFn: () =>
      api<{ sent: true; devCode?: string }>('/auth/otp/request', {
        method: 'POST',
        body: { email: email.trim() },
        auth: false,
      }),
    onSuccess: res =>
      navigation.navigate('Code', {
        email: email.trim().toLowerCase(),
        devCode: res.devCode,
      }),
  });

  const submit = () => {
    setTouched(true);
    if (valid) request.mutate();
  };

  return (
    <Screen
      leading="back"
      title="What’s your email?"
      subtitle="We’ll send you a 6-digit code. No password to remember."
      footer={
        <Button
          label="Send code"
          onPress={submit}
          loading={request.isPending}
          disabled={touched && !valid}
        />
      }
    >
      <Input
        label="Email"
        icon={Mail}
        value={email}
        onChangeText={setEmail}
        onBlur={() => setTouched(true)}
        onSubmitEditing={submit}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        autoFocus
        returnKeyType="send"
        error={
          request.error
            ? errorMessage(request.error)
            : touched && email && !valid
            ? 'Enter a valid email address.'
            : null
        }
      />
    </Screen>
  );
}
