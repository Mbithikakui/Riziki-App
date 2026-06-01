// frontend/src/components/TransactionCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Transaction } from '../api/transactions';
import { COLORS } from '../styles/colors';
import { TYPOGRAPHY } from '../styles/typography';

interface TransactionCardProps {
  transaction: Transaction;
  onSelect: () => void;
}

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, onSelect }) => {
  return (
    <TouchableOpacity onPress={onSelect} style={styles.card}>
      <Text style={TYPOGRAPHY.cardLabel}>{transaction.type}</Text>
      <Text style={TYPOGRAPHY.body}>Amount: {transaction.amount_kes} KES</Text>
      <Text style={TYPOGRAPHY.body}>Status: {transaction.status}</Text>
      <Text style={TYPOGRAPHY.caption}>Date: {transaction.created_at}</Text>
    </TouchableOpacity>
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

export default TransactionCard;
