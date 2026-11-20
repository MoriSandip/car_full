import React, {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useDispatch} from 'react-redux';
import {
  ActionButton,
  Card,
  colors,
  InfoMessage,
  Page,
  PageTitle,
  TextField,
} from '../../components/mobile/ui';
import {
  useCustomerLoginMutation,
  useCustomerRegisterMutation,
  useRequestLoginOtpMutation,
  useRequestPasswordResetMutation,
  useResetPasswordMutation,
  useVerifyLoginOtpMutation,
  useWorkerLoginMutation,
  userFromLogin,
} from '../../store/auth.api';
import {AppRole, setCredentials} from '../../store/auth.slice';

const readError = (error: unknown) => {
  const response = error as {
    data?: {message?: string; error?: {message?: string}};
    message?: string;
  };
  return (
    response.data?.message ||
    response.data?.error?.message ||
    response.message ||
    'Could not connect. Check your network and try again.'
  );
};

const AuthScreen = ({
  initialRegistering = false,
}: {
  initialRegistering?: boolean;
}) => {
  const dispatch = useDispatch();
  const [role, setRole] = useState<AppRole>('CUSTOMER');
  const [registering, setRegistering] = useState(initialRegistering);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [otpChannel, setOtpChannel] = useState<'email' | 'phone'>('email');
  const [otpIdentifier, setOtpIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpDestination, setOtpDestination] = useState('');
  const [developmentOtp, setDevelopmentOtp] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [customerLogin, customerState] = useCustomerLoginMutation();
  const [workerLogin, workerState] = useWorkerLoginMutation();
  const [requestLoginOtp, requestOtpState] = useRequestLoginOtpMutation();
  const [verifyLoginOtp, verifyOtpState] = useVerifyLoginOtpMutation();
  const [registerCustomer, registerState] = useCustomerRegisterMutation();
  const [requestPasswordReset, requestResetState] =
    useRequestPasswordResetMutation();
  const [resetPassword, resetPasswordState] = useResetPasswordMutation();
  const isLoading =
    customerState.isLoading ||
    workerState.isLoading ||
    registerState.isLoading ||
    requestResetState.isLoading ||
    resetPasswordState.isLoading;
  const isOtpLoading = requestOtpState.isLoading || verifyOtpState.isLoading;

  const changeRole = (nextRole: AppRole) => {
    setRole(nextRole);
    setRegistering(false);
    setCodeSent(false);
    setOtpRequested(false);
    setOtpCode('');
    setOtpDestination('');
    setDevelopmentOtp('');
    setResetCode('');
    setError('');
    setNotice('');
  };

  const handleRequestLoginOtp = async () => {
    setError('');
    setNotice('');
    if (!otpIdentifier.trim()) {
      setError(`Enter your registered ${otpChannel === 'email' ? 'email address' : 'phone number'}.`);
      return;
    }

    try {
      const response = await requestLoginOtp({
        role,
        channel: otpChannel,
        identifier: otpIdentifier.trim(),
      }).unwrap();
      setOtpRequested(true);
      setOtpDestination(response.data.destination);
      setDevelopmentOtp(response.data.developmentOtp ?? '');
      setOtpCode('');
      setNotice(response.message);
    } catch (requestError) {
      setError(readError(requestError));
    }
  };

  const handleVerifyLoginOtp = async () => {
    setError('');
    setNotice('');
    if (otpCode.length !== 6) {
      setError('Enter the 6-digit OTP.');
      return;
    }
    try {
      const response = await verifyLoginOtp({
        role,
        channel: otpChannel,
        identifier: otpIdentifier.trim(),
        code: otpCode,
      }).unwrap();
      dispatch(setCredentials(userFromLogin(response, role)));
    } catch (requestError) {
      setError(readError(requestError));
    }
  };

  const handleRequestReset = async () => {
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('Enter your account email address.');
      return;
    }

    try {
      const response = await requestPasswordReset({
        email: email.trim().toLowerCase(),
        role,
      }).unwrap();
      setCodeSent(true);
      setNotice(response.message);
    } catch (requestError) {
      setError(readError(requestError));
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setNotice('');
    if (resetCode.length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
      setError('Choose a password between 8 and 72 characters.');
      return;
    }

    try {
      const response = await resetPassword({
        email: email.trim().toLowerCase(),
        role,
        code: resetCode,
        newPassword,
      }).unwrap();
      setRecovering(false);
      setCodeSent(false);
      setResetCode('');
      setNewPassword('');
      setPassword('');
      setNotice(response.message);
    } catch (requestError) {
      setError(readError(requestError));
    }
  };

  const handleSubmit = async () => {
    setError('');
    setNotice('');
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (registering && (!name.trim() || phone.trim().length < 10)) {
      setError('Enter your name and a valid phone number.');
      return;
    }

    try {
      if (role === 'CUSTOMER' && registering) {
        await registerCustomer({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          address: address.trim(),
          password,
        }).unwrap();
        setRegistering(false);
      }

      const response =
        role === 'CUSTOMER'
          ? await customerLogin({
              email: email.trim().toLowerCase(),
              password,
            }).unwrap()
          : await workerLogin({
              email: email.trim().toLowerCase(),
              password,
            }).unwrap();

      dispatch(setCredentials(userFromLogin(response, role)));
    } catch (requestError) {
      setError(readError(requestError));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Page contentStyle={styles.page}>
        <View style={styles.brand}>
          <Text style={styles.brandMark}>CW</Text>
          <Text style={styles.brandName}>CarWash</Text>
        </View>
        <PageTitle
          title={
            recovering
              ? codeSent
                ? 'Set a new password'
                : 'Reset your password'
              : registering
                ? 'Create your account'
                : 'Welcome back'
          }
          subtitle={
            recovering
              ? codeSent
                ? `Enter the code sent to ${email} and choose a new password.`
                : 'Enter your email and we will send a one-time reset code.'
              : role === 'CUSTOMER'
                ? 'Sign in to book a wash and track your car.'
                : 'Sign in to see your assigned wash jobs.'
          }
        />

        <View style={styles.roleSwitch}>
          {(['CUSTOMER', 'WORKER'] as const).map(option => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{selected: role === option}}
              onPress={() => changeRole(option)}
              style={[
                styles.roleOption,
                role === option && styles.roleSelected,
              ]}>
              <Text
                style={[
                  styles.roleText,
                  role === option && styles.roleTextSelected,
                ]}>
                {option === 'CUSTOMER' ? 'Customer' : 'Worker'}
              </Text>
            </Pressable>
          ))}
        </View>

        {!recovering && !registering && (
          <View style={styles.loginMethodSwitch}>
            {(['password', 'otp'] as const).map(method => (
              <Pressable
                key={method}
                accessibilityRole="button"
                accessibilityState={{selected: loginMethod === method}}
                onPress={() => {
                  setLoginMethod(method);
                  setOtpRequested(false);
                  setOtpCode('');
                  setError('');
                  setNotice('');
                }}
                style={[
                  styles.otpChannelOption,
                  loginMethod === method && styles.otpChannelSelected,
                ]}>
                <Text
                  style={[
                    styles.roleText,
                    loginMethod === method && styles.roleTextSelected,
                  ]}>
                  {method === 'password' ? 'Email & password' : 'Login with OTP'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Card>
          {!recovering && registering && (
            <TextField
              accessibilityLabel="Full name"
              placeholder="Full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
            />
          )}
          {!recovering && !registering && loginMethod === 'otp' ? null : (
            <TextField
              accessibilityLabel="Email address"
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!recovering || !codeSent}
              returnKeyType="next"
            />
          )}
          {!recovering && !registering && loginMethod === 'otp' && (
            <>
              <View style={styles.otpChannelSwitch}>
                {(['email', 'phone'] as const).map(channel => (
                  <Pressable
                    key={channel}
                    accessibilityRole="button"
                    accessibilityState={{selected: otpChannel === channel}}
                    onPress={() => {
                      setOtpChannel(channel);
                      setOtpRequested(false);
                      setOtpCode('');
                      setError('');
                      setNotice('');
                    }}
                    style={[
                      styles.otpChannelOption,
                      otpChannel === channel && styles.otpChannelSelected,
                    ]}>
                    <Text
                      style={[
                        styles.roleText,
                        otpChannel === channel && styles.roleTextSelected,
                      ]}>
                      {channel === 'email' ? 'Email' : 'Phone'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextField
                accessibilityLabel={
                  otpChannel === 'email' ? 'Registered email address' : 'Registered phone number'
                }
                placeholder={
                  otpChannel === 'email' ? 'Registered email address' : 'Registered phone number'
                }
                value={otpIdentifier}
                onChangeText={value => {
                  setOtpIdentifier(value);
                  setOtpRequested(false);
                  setOtpCode('');
                  setOtpDestination('');
                  setDevelopmentOtp('');
                }}
                autoCapitalize="none"
                autoComplete={otpChannel === 'email' ? 'email' : 'tel'}
                keyboardType={otpChannel === 'email' ? 'email-address' : 'phone-pad'}
                textContentType={otpChannel === 'email' ? 'emailAddress' : 'telephoneNumber'}
                returnKeyType="next"
              />
              {otpRequested && (
                <>
                  <Text style={styles.otpHint}>
                    OTP destination: {otpDestination}
                    {developmentOtp ? ` - Development OTP: ${developmentOtp}` : ''}
                  </Text>
                  <TextField
                    accessibilityLabel="6-digit login OTP"
                    placeholder="6-digit OTP"
                    value={otpCode}
                    onChangeText={value =>
                      setOtpCode(value.replace(/\D/g, '').slice(0, 6))
                    }
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    maxLength={6}
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyLoginOtp}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={isOtpLoading}
                    onPress={handleRequestLoginOtp}>
                    <Text style={styles.footerLink}>Resend OTP</Text>
                  </Pressable>
                </>
              )}
            </>
          )}
          {!recovering && registering && (
            <TextField
              accessibilityLabel="Phone number"
              placeholder="Phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              returnKeyType="next"
            />
          )}
          {!recovering && registering && (
            <TextField
              accessibilityLabel="Address"
              placeholder="Address (optional)"
              value={address}
              onChangeText={setAddress}
              autoCapitalize="words"
              returnKeyType="next"
            />
          )}
          {recovering && codeSent ? (
            <>
              <TextField
                accessibilityLabel="6-digit reset code"
                placeholder="6-digit reset code"
                value={resetCode}
                onChangeText={value =>
                  setResetCode(value.replace(/\D/g, '').slice(0, 6))
                }
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={6}
                returnKeyType="next"
              />
              <TextField
                accessibilityLabel="New password"
                placeholder="New password (8+ characters)"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
                textContentType="newPassword"
                maxLength={72}
                returnKeyType="done"
                onSubmitEditing={handleResetPassword}
              />
            </>
          ) : !recovering && (registering || loginMethod === 'password') ? (
            <TextField
              accessibilityLabel="Password"
              placeholder={
                registering ? 'Create password (8+ characters)' : 'Password'
              }
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              textContentType={registering ? 'newPassword' : 'password'}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          ) : null}
          {notice ? <InfoMessage text={notice} variant="success" /> : null}
          {error ? <InfoMessage text={error} variant="error" /> : null}
          <ActionButton
            title={
              isLoading || isOtpLoading
                ? 'Please wait...'
                : recovering
                  ? codeSent
                    ? 'Reset password'
                    : 'Send reset code'
                  : registering
                    ? 'Create account'
                    : loginMethod === 'otp'
                      ? otpRequested
                        ? 'Verify OTP and sign in'
                        : 'Send OTP'
                      : `Sign in as ${role === 'CUSTOMER' ? 'customer' : 'worker'}`
            }
            onPress={
              recovering
                ? codeSent
                  ? handleResetPassword
                  : handleRequestReset
                : loginMethod === 'otp' && !registering
                  ? otpRequested
                    ? handleVerifyLoginOtp
                    : handleRequestLoginOtp
                  : handleSubmit
            }
            disabled={isLoading || isOtpLoading}
          />
        </Card>

        {recovering ? (
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setRecovering(false);
                setCodeSent(false);
                setError('');
                setNotice('');
              }}>
              <Text style={styles.footerLink}>Return to sign in</Text>
            </Pressable>
            {codeSent ? (
              <Pressable
                accessibilityRole="button"
                disabled={isLoading}
                onPress={handleRequestReset}>
                <Text style={styles.footerLink}>Resend code</Text>
              </Pressable>
            ) : null}
          </View>
        ) : role === 'CUSTOMER' ? (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {registering ? 'Already have an account?' : 'New to CarWash?'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setRegistering(!registering);
                setError('');
                setNotice('');
              }}>
              <Text style={styles.footerLink}>
                {registering ? 'Sign in' : 'Create account'}
              </Text>
            </Pressable>
            {!registering && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setRecovering(true);
                  setError('');
                  setNotice('');
                }}>
                <Text style={styles.footerLink}>Forgot password?</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.footer}>
            <InfoMessage text="Worker accounts are created by your administrator." />
            {!registering && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setRecovering(true);
                  setError('');
                  setNotice('');
                }}>
                <Text style={styles.footerLink}>Forgot password?</Text>
              </Pressable>
            )}
          </View>
        )}
      </Page>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboard: {flex: 1},
  page: {flexGrow: 1, justifyContent: 'center', paddingVertical: 40},
  brand: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20},
  brandMark: {
    width: 44,
    height: 44,
    lineHeight: 44,
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: colors.primary,
    color: colors.white,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
  },
  brandName: {fontSize: 21, fontWeight: '800', color: colors.ink},
  roleSwitch: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 13,
    backgroundColor: '#E8EEF1',
  },
  roleOption: {flex: 1, alignItems: 'center', paddingVertical: 12},
  roleSelected: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    elevation: 1,
  },
  roleText: {fontSize: 14, fontWeight: '600', color: colors.muted},
  roleTextSelected: {color: colors.primaryDark},
  loginMethodSwitch: {
    flexDirection: 'row',
    marginBottom: 14,
    padding: 4,
    borderRadius: 13,
    backgroundColor: '#E8EEF1',
  },
  otpChannelSwitch: {flexDirection: 'row', gap: 8},
  otpChannelOption: {flex: 1, alignItems: 'center', paddingVertical: 11},
  otpChannelSelected: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    elevation: 1,
  },
  otpHint: {fontSize: 13, color: colors.muted},
  footer: {flexDirection: 'row', justifyContent: 'center', gap: 6},
  footerText: {color: colors.muted, fontSize: 14},
  footerLink: {color: colors.primaryDark, fontSize: 14, fontWeight: '700'},
});

export default AuthScreen;
