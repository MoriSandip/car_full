import {StyleSheet} from 'react-native';
import {FontSize} from '../../theme/font-size';
import {scale} from '../../theme/scale';
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
      paddingTop: scale(20),
      paddingBottom: scale(32),
    },

    /* Header */

    header: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    backButton: {
      width: scale(42),
      height: scale(42),
      borderRadius: scale(13),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },

    brandContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: scale(12),
    },

    logoContainer: {
      width: scale(40),
      height: scale(40),
      borderRadius: scale(12),
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#111827',
    },

    logoText: {
      marginLeft: scale(10),
      fontSize: FontSize.FONT_22Px,
      fontFamily: typography.bold,
      color: '#111827',
    },

    /* Heading */

    headingContainer: {
      marginTop: scale(34),
      marginBottom: scale(24),
    },

    heading: {
      fontSize: scale(28),
      lineHeight: scale(35),
      fontFamily: typography.bold,
      color: '#111827',
      letterSpacing: -0.5,
    },

    subtitle: {
      marginTop: scale(8),
      fontSize: FontSize.FONT_14Px,
      lineHeight: scale(21),
      fontFamily: typography.regular,
      color: '#6B7280',
    },

    /* Form */

    formCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: scale(20),
      paddingHorizontal: scale(18),
      paddingVertical: scale(20),

      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.06,
      shadowRadius: 15,
      elevation: 3,
    },

    inputBlock: {
      marginBottom: scale(16),
    },

    inputBlockLast: {
      marginBottom: scale(4),
    },

    inputLabel: {
      marginBottom: scale(7),
      fontSize: FontSize.FONT_12Px,
      fontFamily: typography.semiBold,
      color: '#374151',
    },

    /* Buttons */

    primaryButton: {
      marginTop: scale(20),
      minHeight: scale(50),
      borderRadius: scale(13),
      backgroundColor: '#111827',
    },

    primaryButtonText: {
      fontSize: FontSize.FONT_16Px,
      fontFamily: typography.bold,
      color: '#FFFFFF',
    },

    secondaryButton: {
      marginTop: scale(10),
      minHeight: scale(50),
      borderRadius: scale(13),
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },

    secondaryButtonText: {
      fontSize: FontSize.FONT_14Px,
      fontFamily: typography.semiBold,
      color: '#111827',
    },

    /* Divider */

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

    /* Social */

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
    },

    socialText: {
      marginLeft: scale(8),
      fontSize: FontSize.FONT_13Px,
      fontFamily: typography.semiBold,
      color: '#111827',
    },

    /* Footer */

    footer: {
      alignItems: 'center',
      paddingHorizontal: scale(20),
      marginTop: scale(24),
    },

    footerText: {
      textAlign: 'center',
      fontSize: scale(10),
      lineHeight: scale(16),
      fontFamily: typography.regular,
      color: '#9CA3AF',
    },
  });