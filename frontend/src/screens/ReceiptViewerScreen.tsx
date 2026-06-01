// frontend/src/screens/ReceiptViewerScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { getReceipt } from '../api/receipts';
import { Receipt } from '../api/receipts';
import { COLORS } from '../styles/colors';

const ReceiptViewerScreen = ({ route }: {route: any}) => {
  const { id } = route.params;
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReceipt = async () => {
      const receiptData = await getReceipt(id);
      setReceipt(receiptData);
      setLoading(false);
    };

    fetchReceipt();
  }, [id]);

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} />;
  }

  return (
    <View style={styles.container}>
      {receipt ? (
        <>
          <Text style={styles.title}>Receipt Number: {receipt.receipt_number}</Text>
          <Text style={styles.details}>Admin: {receipt.admin_name}</Text>
          <Text style={styles.details}>Created At: {receipt.created_at}</Text>
        </>
      ) : (
        <Text>No receipt found.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  details: {
    fontSize: 18,
    marginTop: 10,
  },
});

export default ReceiptViewerScreen;
