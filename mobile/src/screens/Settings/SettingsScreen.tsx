import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Avatar } from '../../components/ui/Avatar';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { fontSizes, fontWeights, radii, shadows, spacing, useTheme, useThemeColors } from '../../theme';

type SettingsScreenProps = {
  navigation: any;
  route?: any;
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: spacing.xl,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      gap: spacing.md,
      backgroundColor: colors.surface,
      ...(shadows.sm as object),
    },
    profileInfo: {
      flex: 1,
      flexShrink: 1,
    },
    profileName: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.bold,
      color: colors.text,
      marginBottom: spacing.xxs,
    },
    profileEmail: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      marginBottom: spacing.xxs,
    },
    profileHousehold: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      color: colors.primary,
    },
    section: {
      marginTop: spacing.lg,
      marginHorizontal: spacing.md,
    },
    sectionTitle: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.bold,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
      color: colors.textSecondary,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      borderRadius: radii.md,
      marginBottom: spacing.xs,
      borderWidth: 1,
      borderColor: colors.borderLight,
      backgroundColor: colors.surface,
      ...(shadows.xs as object),
    },
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing.md,
    },
    optionIcon: {
      width: 48,
      height: 48,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionContent: {
      flex: 1,
      flexShrink: 1,
    },
    optionTitle: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      marginBottom: spacing.xxs,
      color: colors.text,
    },
    optionDescription: {
      fontSize: fontSizes.sm,
      lineHeight: 18,
      color: colors.textSecondary,
    },
  });

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  const { selectedHousehold } = useHousehold();
  const colors = useThemeColors();
  const { theme, toggleTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  // If Settings was opened from HouseholdSelect (not inside a household), hide household-only rows
  const fromHouseholdSelect = route?.params?.fromHouseholdSelect || false;
  const showHouseholdOptions = !!selectedHousehold && !fromHouseholdSelect;

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <ScreenHeader title="Settings" />

        <View style={styles.profileCard}>
          <Avatar name={user?.name} uri={user?.avatarUrl} size={64} />
          <View style={styles.profileInfo}>
            <AppText style={styles.profileName}>{user?.name}</AppText>
            <AppText style={styles.profileEmail}>{user?.email}</AppText>
            {selectedHousehold && <AppText style={styles.profileHousehold}>{selectedHousehold.name}</AppText>}
          </View>
        </View>

        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Settings</AppText>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => navigation.navigate('AccountSettings')}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.optionIcon, { backgroundColor: colors.primaryUltraSoft }]}>
                <Ionicons name="person-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.optionContent}>
                <AppText style={styles.optionTitle}>Account Settings</AppText>
                <AppText style={styles.optionDescription}>Manage your profile, password, and account</AppText>
              </View>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {showHouseholdOptions && (
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => navigation.navigate('HouseholdSettings')}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.optionIcon, { backgroundColor: colors.accentUltraSoft }]}>
                  <Ionicons name="home-outline" size={24} color={colors.accent} />
                </View>
                <View style={styles.optionContent}>
                  <AppText style={styles.optionTitle}>Household Settings</AppText>
                  <AppText style={styles.optionDescription}>Manage household, members, and actions</AppText>
                </View>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Appearance</AppText>

          <View style={styles.optionRow}>
            <View style={styles.optionLeft}>
              <View style={[styles.optionIcon, { backgroundColor: colors.accentUltraSoft }]}>
                <Ionicons
                  name={theme === 'dark' ? 'moon' : 'sunny-outline'}
                  size={24}
                  color={colors.accent}
                />
              </View>
              <View style={styles.optionContent}>
                <AppText style={styles.optionTitle}>Dark Mode</AppText>
                <AppText style={styles.optionDescription}>
                  {theme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled'}
                </AppText>
              </View>
            </View>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>Actions</AppText>
          <PrimaryButton title="Log Out" onPress={handleLogout} variant="secondary" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
