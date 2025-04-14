import { SafeAreaView, StyleSheet, View, Text } from 'react-native';

const Order = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Text> Order </Text>
    </SafeAreaView>
  );
};

export default Order;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
