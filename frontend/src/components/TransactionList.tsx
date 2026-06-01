// frontend/src/components/TransactionList.tsx
import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Transaction } from '../api/transactions';
import TransactionCard from './TransactionCard';

interface TransactionListProps {
  transactions: Transaction[];
  onSelectTransaction: (transaction: Transaction) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onSelectTransaction,
}) => {
  return (
    <FlatList
      data={transactions}
      renderItem={({ item }) => (
        <TransactionCard transaction={item} onSelect={() => onSelectTransaction(item)} />
      )}
      keyExtractor={(item) => item.id.toString()}
      style={styles.list}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    paddingBottom: 20,
  },
});

export default TransactionList;
