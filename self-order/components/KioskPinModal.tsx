import { useState } from 'react'
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from 'react-native'

type Props = {
  visible: boolean
  onSubmit: (pin: string) => void
  onCancel: () => void
}

export default function KioskPinModal({ visible, onSubmit, onCancel }: Props) {
  const [pin, setPin] = useState('')

  const handleSubmit = () => {
    onSubmit(pin)
    setPin('')
  }

  const handleCancel = () => {
    setPin('')
    onCancel()
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Admin Access</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter PIN"
            secureTextEntry
            keyboardType="numeric"
            value={pin}
            onChangeText={setPin}
            autoFocus
          />
          <View style={styles.buttons}>
            <Pressable style={styles.cancel} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.confirm} onPress={handleSubmit}>
              <Text style={styles.confirmText}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: 300,
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 4,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancel: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  cancelText: {
    color: '#666',
  },
  confirm: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
  },
})
