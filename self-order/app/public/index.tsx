import React, { useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Button, Icon, TextInput } from 'react-native-paper';
import { Image } from '../../components/image';
import { defaultColor } from '@/constants/Colors';
import { useMutation } from '@apollo/client';
import { CURRENT_TOKEN } from '@/graphql/mutation/token';
import { setAccessToken, setParticipantId } from '@/providers/auth';
import { router } from 'expo-router';
import { FieldValues, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { loginSchema } from '@/resolvers/login';
import FormInput from '@/components/Forms/FormInput';
import { useCallStore } from '@/cache/cart.store';
import { isEmpty } from 'lodash';
import { useValid } from '@/context/ValidContext';

const Public = () => {
  const { tables, deleteTable } = useCallStore();
  const [isNew, setIsNew] = React.useState(true);
  const { setValid } = useValid();
  const { control, handleSubmit, setError } = useForm<FieldValues>({
    resolver: yupResolver(loginSchema as any),
    defaultValues: { code: '' },
  });

  const [getCurrentToken, { loading }] = useMutation(CURRENT_TOKEN, {
    onCompleted: (data) => {
      setAccessToken(data.getToken.token);
      setParticipantId(data.getToken.id);
      setValid(true);
      router.navigate('/');
    },
    onError(err) {
      setError('code', { type: 'custom', message: err.message });
    },
  });

  const handleDeleteTable = (code: string) => {
    deleteTable(code);
  };

  const onSubmit = async (data: FieldValues) => {
    getCurrentToken({ variables: { code: data.code, type: 'Q' } });
  };

  const goTable = async (table: any) => {
    getCurrentToken({ variables: { code: table.code, type: 'Q' } });
  };

  useEffect(() => {
    if (!isEmpty(tables)) {
      setIsNew(false);
    }
  }, [tables]);

  const goCamera = async () => {
    router.push('/public/camera');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            {isNew && (
              <TouchableOpacity
                onPress={() => setIsNew(false)}
                style={{
                  position: 'absolute',
                  top: 40,
                  left: 20,
                  zIndex: 1,
                  backgroundColor: '#b1b1b1',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <Icon source="arrow-left" size={24} color="white" />
              </TouchableOpacity>
            )}

            <View style={[styles.container]}>
              {isNew ? (
                <>
                  <View style={styles.logoContainer}>
                    <Image source={require('../../assets/images/icon.png')} style={styles.logo} />
                  </View>
                  <View style={styles.form}>
                    <FormInput
                      control={control}
                      name="code"
                      label="Ширээний код"
                      mode="outlined"
                      right={<TextInput.Icon icon="camera" color={defaultColor} onPress={goCamera} />}
                      defaultColor={defaultColor}
                    />

                    <Button
                      mode="contained"
                      buttonColor={defaultColor}
                      textColor="#fff"
                      loading={loading}
                      onPress={handleSubmit(onSubmit)}
                      style={styles.button}
                    >
                      Үргэлжлүүлэх
                    </Button>
                  </View>
                </>
              ) : (
                <View style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
                  >
                    {tables.map((table) => (
                      <TouchableOpacity
                        key={table.code}
                        onPress={() => {
                          goTable(table);
                        }}
                        onLongPress={() => {
                          Alert.alert(
                            'Ширээг устгах уу?',
                            `${table.tableName} ширээг устгахдаа итгэлтэй байна уу?`,
                            [
                              { text: 'Болих', style: 'cancel' },
                              {
                                text: 'Устгах',
                                style: 'destructive',
                                onPress: () => handleDeleteTable(table.code),
                              },
                            ],
                            { cancelable: true },
                          );
                        }}
                        activeOpacity={0.8}
                        style={{
                          width: 160,
                          height: 190,
                          marginRight: 16,
                          borderRadius: 16,
                          padding: 12,
                          backgroundColor: '#fff',
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.1,
                          shadowRadius: 6,
                          elevation: 4,
                        }}
                      >
                        <Image
                          source={{ uri: table.branchLogo }}
                          style={{ width: '100%', height: 100, borderRadius: 12, marginBottom: 12 }}
                        />
                        <Text style={{ fontWeight: '600', fontSize: 16, textAlign: 'center' }}>{table.branchName}</Text>
                        <Text style={{ color: '#888', fontSize: 14, marginTop: 4 }}>{table.tableName}</Text>
                      </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                      onPress={() => {
                        setIsNew(true);
                      }}
                      activeOpacity={0.8}
                      style={{
                        width: 160,
                        height: 190,
                        marginRight: 16,
                        borderRadius: 16,
                        padding: 12,
                        backgroundColor: defaultColor,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 6,
                        elevation: 4,
                      }}
                    >
                      <Text style={{ fontWeight: 'bold', fontSize: 52, color: '#fff' }}>+</Text>
                      <Text style={{ color: '#fff', fontSize: 14, marginTop: 8 }}>Ширээ нэмэх</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Public;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  containerLandscape: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 16,
  },
  form: {
    width: 300,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
