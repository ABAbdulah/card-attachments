import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';
import { CircleCheck, FileText, KeyRound, Lock, ShieldCheck, Trash2, Upload } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiError, errorMessage } from '../../api/client';
import { useCards, useImportStatement, type PickedFile } from '../../api/queries';
import type { ImportResult } from '../../api/types';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Input } from '../../components/Input';
import { ProgressBar } from '../../components/Progress';
import { Screen } from '../../components/Screen';
import { Sheet } from '../../components/Sheet';
import { Surface } from '../../components/Surface';
import { formatDay } from '../../lib/format';
import { haptics } from '../../lib/haptics';
import type { AppScreenProps } from '../../navigation/types';
import { celebrateRewards, toast } from '../../store/ui';
import { useTheme } from '../../theme';

const STAGES = ['Uploading securely', 'Reading your statement', 'Finding subscriptions'];

export function ImportScreen({ navigation }: AppScreenProps<'Import'>) {
  const { colors, spacing } = useTheme();
  const cards = useCards();
  const upload = useImportStatement();
  const [file, setFile] = useState<PickedFile | null>(null);
  const [cardId, setCardId] = useState<string | undefined>();
  const [passwordPrompt, setPasswordPrompt] = useState<'required' | 'incorrect' | null>(null);
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = (picked: PickedFile, pdfPassword?: string) => {
    setError(null);
    upload.mutate(
      { file: picked, password: pdfPassword, cardId },
      {
        onSuccess: (res) => {
          haptics.success();
          setPassword('');
          setResult(res);
          if (res.rewards.xpGained > 0 || res.rewards.newBadges.length) {
            celebrateRewards('Statement scanned', res.rewards, `${res.statement.charges} card payments read.`);
          }
        },
        onError: (err) => {
          if (err instanceof ApiError && (err.code === 'PASSWORD_REQUIRED' || err.code === 'PASSWORD_INCORRECT')) {
            setPasswordPrompt(err.code === 'PASSWORD_REQUIRED' ? 'required' : 'incorrect');
            return;
          }
          if (err instanceof ApiError && err.code === 'PLAN_LIMIT') {
            navigation.replace('Paywall', { reason: err.message });
            return;
          }
          haptics.warning();
          setError(errorMessage(err));
        },
      },
    );
  };

  const choose = async () => {
    try {
      const [picked] = await pick({ type: [types.pdf, types.csv, types.plainText], mode: 'import' });
      if (!picked) return;
      if (picked.size && picked.size > 10 * 1024 * 1024) {
        setError('That file is larger than 10 MB. Download a shorter period from your bank.');
        return;
      }
      const next = { uri: picked.uri, name: picked.name ?? 'statement', type: picked.type ?? 'application/pdf' };
      setFile(next);
      send(next);
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      toast(errorMessage(err), 'error');
    }
  };

  if (result) return <ImportDone result={result} onReview={() => navigation.replace('Review')} onClose={() => navigation.goBack()} />;

  return (
    <Screen leading="close" title="Scan a statement" subtitle="We read your card payments and find what renews.">
      {upload.isPending ? (
        <Progressing fileName={file?.name} />
      ) : (
        <>
          <Surface style={{ gap: spacing.md }}>
            <Promise icon={ShieldCheck} text="No bank login. You choose the file." />
            <Promise icon={Trash2} text="Read in memory and deleted straight away." />
            <Promise icon={Lock} text="Only card payments are kept. Transfers and names are dropped." />
          </Surface>

          {cards.data && cards.data.cards.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              <AppText variant="label" color="textMuted">
                Which card is this?
              </AppText>
              <View style={[styles.wrap, { gap: spacing.sm }]}>
                <Chip label="Detect automatically" selected={!cardId} onPress={() => setCardId(undefined)} />
                {cards.data.cards.map((c) => (
                  <Chip key={c.id} label={c.nickname} selected={cardId === c.id} onPress={() => setCardId(c.id)} />
                ))}
              </View>
            </View>
          ) : null}

          {error ? (
            <Surface style={{ borderColor: colors.danger, gap: spacing.sm }}>
              <AppText variant="bodyStrong" color="danger">
                We couldn’t read that file
              </AppText>
              <AppText variant="body" color="textMuted">
                {error}
              </AppText>
            </Surface>
          ) : null}

          <Button label={error ? 'Choose another file' : 'Choose statement file'} icon={Upload} onPress={choose} />
          <AppText variant="caption" color="textMuted" align="center">
            PDF or CSV, up to 10 MB. Twelve months finds the most, including yearly plans.
          </AppText>
        </>
      )}

      <Sheet visible={passwordPrompt !== null} onClose={() => setPasswordPrompt(null)} title="This file has a password">
        <AppText variant="body" color="textMuted">
          Banks often lock statements with a password, such as your date of birth or the last digits of your CNIC. It is used once to open the file and never stored.
        </AppText>
        <Input
          label="Statement password"
          icon={KeyRound}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoFocus
          error={passwordPrompt === 'incorrect' ? 'That password did not open the file.' : null}
          onSubmitEditing={() => file && password && (setPasswordPrompt(null), send(file, password))}
        />
        <Button
          label="Open statement"
          disabled={!password}
          onPress={() => {
            if (!file) return;
            setPasswordPrompt(null);
            send(file, password);
          }}
        />
      </Sheet>
    </Screen>
  );
}

function Promise({ icon: Icon, text }: { icon: typeof Lock; text: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.row, { gap: spacing.md }]}>
      <Icon color={colors.success} size={20} />
      <AppText variant="body" style={styles.flex}>
        {text}
      </AppText>
    </View>
  );
}

/** Staged progress while the single upload request runs. */
function Progressing({ fileName }: { fileName?: string }) {
  const { colors, spacing } = useTheme();
  const [stage, setStage] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current = [setTimeout(() => setStage(1), 1200), setTimeout(() => setStage(2), 3200)];
    return () => timers.current.forEach(clearTimeout);
  }, []);

  return (
    <Surface style={{ gap: spacing.lg }}>
      <View style={[styles.row, { gap: spacing.md }]}>
        <FileText color={colors.primary} size={24} />
        <AppText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
          {fileName ?? 'Statement'}
        </AppText>
      </View>
      <ProgressBar progress={(stage + 1) / (STAGES.length + 0.6)} accessibilityLabel="Reading statement" />
      <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
        {STAGES.map((label, i) => (
          <View key={label} style={[styles.row, { gap: spacing.sm }]}>
            <CircleCheck color={i < stage ? colors.success : colors.border} size={18} />
            <AppText variant="body" color={i <= stage ? 'text' : 'textMuted'}>
              {label}
              {i === stage ? '…' : ''}
            </AppText>
          </View>
        ))}
      </View>
    </Surface>
  );
}

function ImportDone({ result, onReview, onClose }: { result: ImportResult; onReview: () => void; onClose: () => void }) {
  const { colors, spacing } = useTheme();
  const { statement, candidates, alerts } = result;
  const found = candidates.length;

  return (
    <Screen
      leading="close"
      title={found ? `Found ${found} ${found === 1 ? 'subscription' : 'subscriptions'}` : 'Statement scanned'}
      subtitle={`${statement.bank} · ${formatDay(statement.periodStart)} to ${formatDay(statement.periodEnd)}`}
      footer={found ? <Button label="Review what we found" onPress={onReview} /> : <Button label="Done" onPress={onClose} />}
    >
      <Surface style={{ gap: spacing.md }}>
        <Line label="Card payments read" value={String(statement.charges)} />
        <Line label="Different merchants" value={String(statement.merchants)} />
        {statement.duplicates ? <Line label="Already imported before" value={String(statement.duplicates)} /> : null}
        {result.updatedSubscriptions.length ? <Line label="Subscriptions updated" value={String(result.updatedSubscriptions.length)} /> : null}
      </Surface>

      {alerts.map((a) => (
        <Surface key={a.title} style={{ gap: spacing.xs, borderColor: a.type === 'VERIFIED_CANCEL' ? colors.success : colors.danger }}>
          <AppText variant="bodyStrong" color={a.type === 'VERIFIED_CANCEL' ? 'success' : 'danger'}>
            {a.title}
          </AppText>
          <AppText variant="body" color="textMuted">
            {a.body}
          </AppText>
        </Surface>
      ))}

      {!found ? (
        <AppText variant="body" color="textMuted">
          No new subscriptions in this statement. Everything that renews is already on your list. Check the Cards tab to see every merchant that charged this card.
        </AppText>
      ) : (
        <AppText variant="body" color="textMuted">
          Nothing is added until you confirm it.
        </AppText>
      )}
    </Screen>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={[styles.row, styles.between]}>
      <AppText variant="body" color="textMuted">
        {label}
      </AppText>
      <AppText variant="bodyStrong" tabular>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { justifyContent: 'space-between' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
