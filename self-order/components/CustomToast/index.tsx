import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface CustomToastProps {
  type?: string;
  message?: any;
  title?: string;
}

const CustomToast: React.FC<CustomToastProps> = ({ type, message, title }) => {
  return (
    <View style={styles.container}>
      <View style={styles.accent} />
      <View style={styles.content}>
        {title && <Text style={styles.title}>{title}</Text>}
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
};

export default CustomToast;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginHorizontal: 16,
  },
  accent: {
    width: 4,
    backgroundColor: '#1ecb84',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  content: {
    marginLeft: 10,
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: '#666',
  },
});
