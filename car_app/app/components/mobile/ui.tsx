import React, {PropsWithChildren} from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

const palette = {
  white: '#FFFFFF',
  ink: '#102334',
  muted: '#607386',
  border: '#DFE7EC',
  surface: '#FFFFFF',
  canvas: '#F4F7F9',
  primary: '#087E8B',
  primaryDark: '#05636D',
  danger: '#B42318',
  success: '#13795B',
  paleBlue: '#E6F4F5',
};

export const Page = ({
  children,
  contentStyle,
}: PropsWithChildren<{contentStyle?: StyleProp<ViewStyle>}>) => (
  <SafeAreaView style={styles.safe}>
    <ScrollView
      contentContainerStyle={[styles.page, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  </SafeAreaView>
);

export const PageTitle = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => (
  <View style={styles.titleBlock}>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

export const TextField = (props: TextInputProps) => (
  <TextInput
    placeholderTextColor="#8797A5"
    style={[styles.input, props.multiline && styles.multiline]}
    {...props}
  />
);

export const ActionButton = ({
  title,
  onPress,
  disabled,
  variant = 'primary',
  style,
}: {
  title: string;
  onPress: PressableProps['onPress'];
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
}) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    disabled={disabled}
    style={({pressed}) => [
      styles.button,
      variant === 'secondary' && styles.buttonSecondary,
      variant === 'danger' && styles.buttonDanger,
      disabled && styles.buttonDisabled,
      pressed && !disabled && styles.buttonPressed,
      style,
    ]}>
    <Text
      style={[
        styles.buttonText,
        variant === 'secondary' && styles.buttonSecondaryText,
      ]}>
      {title}
    </Text>
  </Pressable>
);

export const InfoMessage = ({
  text,
  variant = 'info',
}: {
  text: string;
  variant?: 'info' | 'error' | 'success';
}) => (
  <View
    accessibilityRole={variant === 'error' ? 'alert' : 'text'}
    style={[
      styles.message,
      variant === 'error' && styles.messageError,
      variant === 'success' && styles.messageSuccess,
    ]}>
    <Text
      style={[
        styles.messageText,
        variant === 'error' && styles.messageErrorText,
        variant === 'success' && styles.messageSuccessText,
      ]}>
      {text}
    </Text>
  </View>
);

export const LoadingMessage = ({text = 'Loading...'}: {text?: string}) => (
  <View style={styles.loading}>
    <ActivityIndicator color={palette.primary} />
    <Text style={styles.muted}>{text}</Text>
  </View>
);

export const Card = ({
  children,
  style,
}: PropsWithChildren<{style?: StyleProp<ViewStyle>}>) => (
  <View style={[styles.card, style]}>{children}</View>
);

export const colors = palette;

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: palette.canvas},
  page: {padding: 20, paddingBottom: 36, gap: 16},
  titleBlock: {gap: 5, marginBottom: 2},
  title: {fontSize: 25, fontWeight: '800', color: palette.ink},
  subtitle: {fontSize: 14, lineHeight: 20, color: palette.muted},
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: palette.ink,
    backgroundColor: palette.surface,
    fontSize: 15,
  },
  multiline: {minHeight: 88, paddingTop: 12, textAlignVertical: 'top'},
  button: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonSecondary: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  buttonDanger: {backgroundColor: palette.danger},
  buttonDisabled: {opacity: 0.5},
  buttonPressed: {opacity: 0.82},
  buttonText: {color: palette.surface, fontSize: 15, fontWeight: '700'},
  buttonSecondaryText: {color: palette.ink},
  message: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: palette.paleBlue,
  },
  messageError: {backgroundColor: '#FDECEA'},
  messageSuccess: {backgroundColor: '#E8F5EE'},
  messageText: {color: palette.primaryDark, fontSize: 13, lineHeight: 18},
  messageErrorText: {color: palette.danger},
  messageSuccessText: {color: palette.success},
  loading: {
    minHeight: 64,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  muted: {color: palette.muted, fontSize: 14},
  card: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 12,
  },
});
