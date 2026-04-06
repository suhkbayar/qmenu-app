import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Button } from 'react-native';
import { router } from 'expo-router';
import { Icon } from 'react-native-paper';
import Loader from '@/src/components/ui/Loader';
import { useMutation } from '@apollo/client';
import { CURRENT_TOKEN } from '@/src/graphql/mutations/token';
import { setAccessToken, setParticipantId } from '@/src/providers/auth';
import { useToast } from 'react-native-toast-notifications';
import { defaultColor } from '@/src/constants/Colors';
import { useValid } from '@/src/providers/ValidProvider';

const CameraScreen = () => {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const toast = useToast();
  const { setValid } = useValid();

  const [getCurrentToken, { loading }] = useMutation(CURRENT_TOKEN, {
    onCompleted: (data) => {
      setAccessToken(data.getToken.token);
      setParticipantId(data.getToken.id);
      setValid(true);
      router.navigate('/');
    },
    onError(err) {
      toast.show(err.message, {
        type: 'warning',
        icon: <Icon source="alert-circle-outline" size={30} color="#fff" />,
        placement: 'top',
        warningColor: defaultColor,
        duration: 4000,
        animationType: 'slide-in',
      });
    },
  });

  const toggleCameraFacing = useCallback(() => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }, []);

  const takePicture = useCallback(
    (barcode: { data?: string }) => {
      if (scanned || !barcode?.data) return;
      const code = barcode.data.split('/').pop();
      if (code) {
        setScanned(true);
        getCurrentToken({ variables: { code, type: 'TB' } });
      }
    },
    [scanned, getCurrentToken],
  );

  if (loading) return <Loader />;
  if (permission && !permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant permission" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        style={StyleSheet.absoluteFill}
        facing={facing}
        onBarcodeScanned={takePicture}
      />
      <TouchableOpacity onPress={router.back} style={styles.backButton}>
        <Icon source="arrow-left" size={24} color="white" />
      </TouchableOpacity>
      <View style={styles.overlay}>
        <View style={styles.barcodeFrame} />
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
          <Text style={styles.text}>Камер эргүүлэх</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CameraScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  message: { textAlign: 'center', paddingBottom: 10 },
  camera: { flex: 1 },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: '#00000080',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barcodeFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#00FF00',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#00000080',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  button: { alignItems: 'center' },
  text: { fontSize: 18, color: 'white', fontWeight: 'bold' },
});
