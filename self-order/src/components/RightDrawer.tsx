import React from 'react';
import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Modal, Portal } from 'react-native-paper';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}

const RightDrawer: React.FC<Props> = ({ visible, onClose, children, width = 450 }) => (
  <Portal>
    <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.modalContainer}>
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <View style={[styles.drawer, { width }]}>
          {children}
        </View>
      </View>
    </Modal>
  </Portal>
);

export default RightDrawer;

const styles = StyleSheet.create({
  modalContainer: { margin: 0, flex: 1 },
  container: { flex: 1, flexDirection: 'row' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  drawer: {
    height: '100%',
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
