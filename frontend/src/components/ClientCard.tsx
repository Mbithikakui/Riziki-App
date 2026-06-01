// frontend/src/components/ClientCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Client } from '../api/clients';
import { COLORS } from '../styles/colors';
import { TYPOGRAPHY } from '../styles/typography';

interface ClientCardProps {
  client: Client;
  onPress: () => void;
}

const ClientCard: React.FC<ClientCardProps> = ({ client, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <Text style={TYPOGRAPHY.cardLabel}>{client.name}</Text>
      <Text style={TYPOGRAPHY.body}>Phone: {client.phone_number}</Text>
      <Text style={TYPOGRAPHY.body}>Type: {client.client_type}</Text>
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

export default ClientCard;
