// frontend/src/components/BalanceCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Balance } from '../api/balance';
import { COLORS } from '../styles/colors';
import { TYPOGRAPHY } from '../styles/typography';

interface BalanceCardProps {
  balance: Balance;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ balance }) => {
  return (
    <View style={styles.card}>
      <Text style={TYPOGRAPHY.cardLabel}>Current Balance</Text>
      <Text style={TYPOGRAPHY.amount}>{balance.amount_kes} KES</Text>
      <Text style={TYPOGRAPHY.caption}>Last updated: {balance.updated_at}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
});

export default BalanceCard;
