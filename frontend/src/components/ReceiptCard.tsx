// frontend/src/components/ReceiptCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Receipt } from '../api/receipts';
import { COLORS } from '../styles/colors';
import { TYPOGRAPHY } from '../styles/typography';

interface ReceiptCardProps {
  receipt: Receipt;
  onSelect: () => void;
}

const ReceiptCard: React.FC<ReceiptCardProps> = ({ receipt, onSelect }) => {
  return (
    <TouchableOpacity onPress={onSelect} style={styles.card}>
      <Text style={TYPOGRAPHY.cardLabel}>Receipt Number: {receipt.receipt_number}</Text>
      <Text style={TYPOGRAPHY.body}>Admin: {receipt.admin_name}</Text>
      <Text style={TYPOGRAPHY.caption}>Created At: {receipt.created_at}</Text>
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

export default ReceiptCard;
