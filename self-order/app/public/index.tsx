import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Button } from 'react-native-paper';
import { Image } from '../../components/image';
import { defaultColor } from '@/constants/Colors';
import { useMutation } from '@apollo/client';
import { CURRENT_TOKEN } from '@/graphql/mutation/token';
import { getToken, setAccessToken, setParticipantId } from '@/providers/auth';
import { router } from 'expo-router';
import { FieldValues, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { loginSchema } from '@/resolvers/login';
import FormInput from '@/components/Forms/FormInput';
import { setStorage } from '@/cache';

const Public = () => {
  const { control, handleSubmit, setError } = useForm<FieldValues>({
    resolver: yupResolver(loginSchema as any),
    defaultValues: { code: '' },
  });

  const [getCurrentToken, { loading }] = useMutation(CURRENT_TOKEN, {
    onCompleted: (data) => {
      console.log(data, ' data response');
      setAccessToken(data.getToken.token);
      setParticipantId(data.getToken.id);
      router.navigate('/');
    },
    onError(err) {
      setError('code', { type: 'custom', message: err.message });
    },
  });

  const onSubmit = async (data: FieldValues) => {
    getCurrentToken({ variables: { code: data.code, type: 'Q' } });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[styles.container]}>
            <View style={styles.logoContainer}>
              <Image source={require('../../assets/images/icon.png')} style={styles.logo} />
            </View>
            <View style={styles.form}>
              <FormInput
                control={control}
                name="code"
                label="Ширээний код"
                mode="outlined"
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
  },
});
