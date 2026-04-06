import React, { useCallback, memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FAB } from 'react-native-paper';
import TableQrModal from './modals/TableQrModal';

const TableQrFloatingButton = memo(() => {
  const [showQr, setShowQr] = useState(false);
  const handlePress = useCallback(() => setShowQr(true), []);
  const handleClose = useCallback(() => setShowQr(false), []);

  return (
    <>
      <View style={styles.container}>
        <FAB animated={false} icon="qrcode-scan" style={styles.fab} onPress={handlePress} color="white" />
      </View>
      <TableQrModal visible={showQr} onClose={handleClose} />
    </>
  );
});

export default TableQrFloatingButton;

const styles = StyleSheet.create({
  container: { position: 'absolute', right: 16, bottom: 171 },
  fab: { backgroundColor: '#EB1833', width: 70, height: 70, borderRadius: 999, justifyContent: 'center', alignItems: 'center' },
});
