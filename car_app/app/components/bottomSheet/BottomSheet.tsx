import React, { useEffect } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { IBottomSheetProps } from './BottomSheet.props';
import styles from './BottomSheet.styles';

export const BottomSheet = ({
  visible,
  setVisible,
  children,
}: IBottomSheetProps) => {
  useEffect(() => {
    if (visible) Keyboard.dismiss();
  }, [visible]);

  return (
    <Modal
      presentationStyle="overFullScreen"
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={() => setVisible(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoiding}
      >
        <Pressable onPress={() => setVisible(false)} style={styles.dim} />
        <View style={styles.modalOverlay}>{children}</View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
