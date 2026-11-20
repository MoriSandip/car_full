import {StyleSheet} from 'react-native';
import {colors} from '../../theme/colors';
import {scale} from '../../theme/scale';
import {FontSize} from '../../theme/font-size';
import {typography} from '../../theme/typography';

export const createStyles = () =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#F7F8FA',
    },

    container: {
      flex: 1,
    },

    contentContainer: {
      paddingHorizontal: scale(20),
      paddingTop: scale(24),
      paddingBottom: scale(30),
    },

    /* ---------------- HEADER ---------------- */

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: scale(42),
    },

    logoContainer: {
      width: scale(42),
      height: scale(42),
      borderRadius: scale(13),
      backgroundColor: '#111827',
      alignItems: 'center',
      justifyContent: 'center',

      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },

    logoText: {
      marginLeft: scale(11),
      fontSize: FontSize.FONT_24Px,
      fontFamily: typography.bold,
      color: '#111827',
      letterSpacing: -0.5,
    },

    /* ---------------- WELCOME ---------------- */

    welcomeContainer: {
      marginBottom: scale(28),
    },

    welcomeTitle: {
      fontSize: scale(30),
      lineHeight: scale(38),
      fontFamily: typography.bold,
      color: '#111827',
      letterSpacing: -0.7,
    },

    welcomeSubtitle: {
      marginTop: scale(9),
      fontSize: FontSize.FONT_14Px,
      lineHeight: scale(21),
      fontFamily: typography.regular,
      color: '#6B7280',
      maxWidth: '90%',
    },

    /* ---------------- FORM ---------------- */

    formCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: scale(20),
      paddingHorizontal: scale(18),
      paddingVertical: scale(20),

      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.06,
      shadowRadius: 15,
      elevation: 3,
    },

    inputLabel: {
      fontSize: FontSize.FONT_12Px,
      fontFamily: typography.semiBold,
      color: '#374151',
      marginBottom: scale(7),
      textTransform: 'none',
    },

    passwordLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: scale(17),
    },

    forgotPassword: {
      fontSize: FontSize.FONT_12Px,
      fontFamily: typography.semiBold,
      color: '#2563EB',
      marginBottom: scale(7),
    },

    /* ---------------- REMEMBER ---------------- */

    rememberContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: scale(14),
    },

    rememberText: {
      marginLeft: scale(8),
      fontSize: FontSize.FONT_12Px,
      fontFamily: typography.regular,
      color: '#6B7280',
    },

    /* ---------------- BUTTONS ---------------- */

    loginButton: {
      marginTop: scale(22),
      borderRadius: scale(13),
      minHeight: scale(50),
      backgroundColor: '#111827',
    },

    loginButtonText: {
      fontSize: FontSize.FONT_16Px,
      fontFamily: typography.bold,
      color: '#FFFFFF',
    },

    signupButton: {
      marginTop: scale(10),
      borderRadius: scale(13),
      minHeight: scale(50),
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },

    signupButtonText: {
      fontSize: FontSize.FONT_15Px,
      fontFamily: typography.semiBold,
      color: '#111827',
    },

    /* ---------------- DIVIDER ---------------- */

    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: scale(28),
      marginBottom: scale(18),
    },

    divider: {
      flex: 1,
      height: 1,
      backgroundColor: '#E5E7EB',
    },

    dividerText: {
      marginHorizontal: scale(12),
      fontSize: scale(9),
      fontFamily: typography.semiBold,
      color: '#9CA3AF',
      letterSpacing: 0.6,
    },

    /* ---------------- SOCIAL ---------------- */

    socialContainer: {
      flexDirection: 'row',
      columnGap: scale(10),
    },

    socialButton: {
      flex: 1,
      minHeight: scale(48),
      borderRadius: scale(13),
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',

      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.03,
      shadowRadius: 5,
      elevation: 1,
    },

    socialText: {
      marginLeft: scale(8),
      fontSize: FontSize.FONT_13Px,
      fontFamily: typography.semiBold,
      color: '#111827',
    },

    /* ---------------- FOOTER ---------------- */

    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: scale(28),
    },

    footerText: {
      fontSize: FontSize.FONT_12Px,
      fontFamily: typography.regular,
      color: '#9CA3AF',
    },

    footerLink: {
      fontSize: FontSize.FONT_12Px,
      fontFamily: typography.bold,
      color: '#2563EB',
    },
  });