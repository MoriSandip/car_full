import React, {useSyncExternalStore} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  getRequestUiSnapshot,
  resolveApiConfirmation,
  subscribeToRequestUi,
} from '../../store/request-ui';
import {colors} from '../../theme/colors';

const ApiRequestUi = () => {
  const {activeRequests, confirmation} = useSyncExternalStore(
    subscribeToRequestUi,
    getRequestUiSnapshot,
    getRequestUiSnapshot,
  );

  return (
    <>
      <Modal
        visible={Boolean(confirmation)}
        transparent
        animationType="fade"
        onRequestClose={() => resolveApiConfirmation(false)}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <Text style={styles.title}>{confirmation?.title}</Text>
            <Text style={styles.message}>{confirmation?.message}</Text>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => resolveApiConfirmation(false)}
                style={[styles.button, styles.cancelButton]}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => resolveApiConfirmation(true)}
                style={[styles.button, styles.confirmButton]}>
                <Text style={styles.confirmText}>
                  {confirmation?.actionLabel ?? 'Confirm'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={activeRequests > 0}
        transparent
        animationType="fade"
        statusBarTranslucent>
        <View style={styles.loaderBackdrop} accessibilityRole="progressbar">
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Please wait...</Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
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
  title: {fontSize: 19, fontWeight: '800', color: '#102334'},
  message: {fontSize: 15, lineHeight: 22, color: '#607386'},
  actions: {flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8},
  button: {minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 10},
  cancelButton: {backgroundColor: '#F1F4F6'},
  confirmButton: {backgroundColor: colors.primary},
  cancelText: {fontSize: 14, fontWeight: '700', color: '#34495A'},
  confirmText: {fontSize: 14, fontWeight: '700', color: '#FFFFFF'},
  loaderBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 35, 52, 0.28)',
  },
  loaderCard: {
    minWidth: 150,
    alignItems: 'center',
    gap: 12,
    padding: 22,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    elevation: 8,
  },
  loaderText: {fontSize: 14, fontWeight: '600', color: '#34495A'},
});

export default ApiRequestUi;
