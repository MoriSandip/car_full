import React, { useSyncExternalStore } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  dismissApiOutcome,
  getRequestUiSnapshot,
  resolveApiConfirmation,
  subscribeToRequestUi,
} from '../../store/request-ui';
import { colors } from '../../theme/colors';

const ApiRequestUi = () => {
  const { activeRequests, confirmation, outcome } = useSyncExternalStore(
    subscribeToRequestUi,
    getRequestUiSnapshot,
    getRequestUiSnapshot,
  );

  const mode = confirmation
    ? 'confirmation'
    : activeRequests > 0
    ? 'loading'
    : outcome
    ? 'outcome'
    : 'hidden';

  if (mode === 'hidden') return null;

  if (mode === 'loading') {
    return (
      <View pointerEvents="none" style={styles.loadingOverlay}>
        <View style={styles.loaderCard} accessibilityRole="progressbar">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loaderText}>Please wait...</Text>
        </View>
      </View>
    );
  }

  if (mode === 'outcome') {
    return (
      <View pointerEvents="box-none" style={styles.outcomeOverlay}>
        <View
          style={[
            styles.outcomeToast,
            outcome?.success ? styles.successToast : styles.errorToast,
          ]}
        >
          <View style={styles.outcomeCopy}>
            <Text
              style={[
                styles.title,
                outcome?.success ? styles.successTitle : styles.errorTitle,
              ]}
            >
              {outcome?.title}
            </Text>
            <Text style={styles.message}>{outcome?.message}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss action result"
            onPress={dismissApiOutcome}
            style={styles.dismissButton}
          >
            <Text style={styles.dismissText}>Dismiss</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => resolveApiConfirmation(false)}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{confirmation?.title}</Text>
          <Text style={styles.message}>{confirmation?.message}</Text>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => resolveApiConfirmation(false)}
              style={[styles.button, styles.cancelButton]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => resolveApiConfirmation(true)}
              style={[styles.button, styles.confirmButton]}
            >
              <Text style={styles.confirmText}>
                {confirmation?.actionLabel ?? 'Confirm'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    alignItems: 'center',
    paddingTop: 56,
  },
  outcomeOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1001,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
  },
  outcomeToast: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    elevation: 6,
  },
  successToast: { borderColor: '#B7E2D3' },
  errorToast: { borderColor: '#F3C5C1' },
  outcomeCopy: { flex: 1, gap: 4 },
  dismissButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F1F4F6',
  },
  dismissText: { fontSize: 11, fontWeight: '700', color: '#34495A' },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(16, 35, 52, 0.45)',
  },
  dialog: {
    gap: 12,
    borderRadius: 18,
    padding: 22,
    backgroundColor: '#FFFFFF',
    elevation: 8,
  },
  title: { fontSize: 19, fontWeight: '800', color: '#102334' },
  message: { fontSize: 15, lineHeight: 22, color: '#607386' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  cancelButton: { backgroundColor: '#F1F4F6' },
  confirmButton: { backgroundColor: colors.primary },
  cancelText: { fontSize: 14, fontWeight: '700', color: '#34495A' },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  loaderCard: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    elevation: 5,
  },
  successTitle: { color: '#13795B' },
  errorTitle: { color: '#B42318' },
  loaderText: { fontSize: 13, fontWeight: '700', color: '#34495A' },
});

export default ApiRequestUi;
