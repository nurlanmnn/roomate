import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useTheme, useThemeColors } from '../../theme';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ListRow } from '../../components/ui/ListRow';
import { Avatar } from '../../components/ui/Avatar';
import { Ionicons } from '@expo/vector-icons';
import { fontSizes, fontWeights, spacing, radii, shadows } from '../../theme';
import { Alert, Switch } from 'react-native';

export const SettingsScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  const { selectedHousehold } = useHousehold();
  const colors = useThemeColors();
  const { theme, toggleTheme } = useTheme();
  
  // Check if Settings was accessed from HouseholdSelectScreen (not from within a household)
  const fromHouseholdSelect = route?.params?.fromHouseholdSelect || false;
  // Only show household options if we have a household AND we're not coming from HouseholdSelectScreen
  const showHouseholdOptions = selectedHousehold && !fromHouseholdSelect;

  const handleLogout = async () => {
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

  const dynamicStyles = {
    container: { ...styles.container, backgroundColor: colors.background },
    profileCard: { ...styles.profileCard, backgroundColor: colors.surface, borderColor: colors.borderLight },
    profileName: { ...styles.profileName, color: colors.text },
    profileEmail: { ...styles.profileEmail, color: colors.textSecondary },
    profileHousehold: { ...styles.profileHousehold, color: colors.primary },
    sectionTitle: { ...styles.sectionTitle, color: colors.textSecondary },
    optionRow: { ...styles.optionRow, backgroundColor: colors.surface, borderColor: colors.borderLight },
    optionTitle: { ...styles.optionTitle, color: colors.text },
    optionDescription: { ...styles.optionDescription, color: colors.textSecondary },
  };

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <ScreenHeader title="Settings" />

        {/* User Profile Summary */}
        <View style={dynamicStyles.profileCard}>
          <Avatar name={user?.name} uri={user?.avatarUrl} size={64} />
          <View style={styles.profileInfo}>
            <AppText style={dynamicStyles.profileName}>{user?.name}</AppText>
            <AppText style={dynamicStyles.profileEmail}>{user?.email}</AppText>
            {selectedHousehold && (
              <AppText style={dynamicStyles.profileHousehold}>{selectedHousehold.name}</AppText>
            )}
          </View>
        </View>

        {/* Settings Options */}
        <View style={styles.section}>
          <AppText style={dynamicStyles.sectionTitle}>Settings</AppText>
          
          <TouchableOpacity
            style={dynamicStyles.optionRow}
            onPress={() => navigation.navigate('AccountSettings')}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.optionIcon, { backgroundColor: colors.primaryUltraSoft }]}>
                <Ionicons name="person-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.optionContent}>
                <AppText style={dynamicStyles.optionTitle}>Account Settings</AppText>
                <AppText style={dynamicStyles.optionDescription}>
                  Manage your profile, password, and account
                </AppText>
              </View>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {showHouseholdOptions && (
            <TouchableOpacity
              style={dynamicStyles.optionRow}
              onPress={() => navigation.navigate('HouseholdSettings')}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.optionIcon, { backgroundColor: colors.accentUltraSoft }]}>
                  <Ionicons name="home-outline" size={24} color={colors.accent} />
                </View>
                <View style={styles.optionContent}>
                  <AppText style={dynamicStyles.optionTitle}>Household Settings</AppText>
                  <AppText style={dynamicStyles.optionDescription}>
                    Manage household, members, and actions
                  </AppText>
                </View>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <AppText style={dynamicStyles.sectionTitle}>Appearance</AppText>
          <TouchableOpacity
            style={dynamicStyles.optionRow}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.optionIcon, { backgroundColor: colors.accentUltraSoft }]}>
                <Ionicons 
                  name={theme === 'dark' ? 'moon' : 'sunny-outline'} 
                  size={24} 
                  color={colors.accent} 
                />
              </View>
              <View style={styles.optionContent}>
                <AppText style={dynamicStyles.optionTitle}>Dark Mode</AppText>
                <AppText style={dynamicStyles.optionDescription}>
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
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <AppText style={dynamicStyles.sectionTitle}>Actions</AppText>
          <PrimaryButton
            title="Log Out"
            onPress={handleLogout}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    gap: spacing.md,
    ...(shadows.sm as object),
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.xxs,
  },
  profileEmail: {
    fontSize: fontSizes.sm,
    marginBottom: spacing.xxs,
  },
  profileHousehold: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
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
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
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
  },
  optionTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.xxs,
  },
  optionDescription: {
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
});
