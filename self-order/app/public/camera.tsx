import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Button } from 'react-native';
import { router } from 'expo-router';
import { Icon } from 'react-native-paper';
import Loader from '@/components/Loader';
import { useMutation } from '@apollo/client';
import { CURRENT_TOKEN } from '@/graphql/mutation/token';
import { setAccessToken, setParticipantId } from '@/providers/auth';
import { useToast } from 'react-native-toast-notifications';
import { defaultColor } from '@/constants/Colors';
import { useValid } from '@/context/ValidContext';

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

  function toggleCameraFacing() {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }

  const takePicture = async (barcode: any) => {
    if (scanned || !barcode?.data) return; // skip if already scanned

    const qrData = barcode.data;
    const code = qrData.split('/').pop(); // <-- This gets "ZzSx4OkU1"

    if (code) {
      setScanned(true); // mark as scanned

      getCurrentToken({ variables: { code: code, type: 'Q' } });
    }
  };

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant permission" />
      </View>
    );
  }

  if (loading) return <Loader />;

  return (
    <View style={styles.container}>
      <CameraView
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        style={styles.camera}
        facing={facing}
        onBarcodeScanned={takePicture}
      >
        {/* Back Button */}
        <TouchableOpacity onPress={router.back} style={styles.backButton}>
          <Icon source="arrow-left" size={24} color="white" />
        </TouchableOpacity>

        {/* Barcode Frame */}
        <View style={styles.overlay}>
          <View style={styles.barcodeFrame} />
        </View>

        {/* Flip Camera Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
            <Text style={styles.text}>Камер эргүүлэх</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
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
  backText: {
    color: '#fff',
    fontSize: 20,
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
  button: {
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default CameraScreen;
