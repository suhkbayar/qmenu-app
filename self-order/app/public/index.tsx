import React, { useCallback, useEffect, useState } from 'react';
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
import { Image } from '@/src/components/ui/Image';
import { defaultColor } from '@/src/constants/Colors';
import { useThemeStore } from '@/src/store/theme.store';
import { useMutation } from '@apollo/client';
import { CURRENT_TOKEN } from '@/src/graphql/mutations/token';
import { setAccessToken, setParticipantId } from '@/src/providers/auth';
import { router } from 'expo-router';
import { FieldValues, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { loginSchema } from '@/src/utils/schemas';
import FormInput from '@/src/components/forms/FormInput';
import { useCallStore } from '@/src/store/cart.store';
import { isEmpty } from 'lodash';
import { useValid } from '@/src/providers/ValidProvider';

const Public = () => {
  const tables = useCallStore((s) => s.tables);
  const deleteTable = useCallStore((s) => s.deleteTable);
  const { theme, isDark, toggleTheme } = useThemeStore();
  const [isNew, setIsNew] = useState(true);
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

  useEffect(() => {
    if (!isEmpty(tables)) setIsNew(false);
  }, [tables]);

  const goCamera = useCallback(() => {
    router.push('/public/camera');
  }, []);

  const onSubmit = useCallback(
    (data: FieldValues) => {
      getCurrentToken({ variables: { code: data.code, type: 'TB' } });
    },
    [getCurrentToken],
  );

  const goTable = useCallback(
    (table: { code: string }) => {
      getCurrentToken({ variables: { code: table.code, type: 'TB' } });
    },
    [getCurrentToken],
  );

  const handleDeleteTable = useCallback(
    (code: string) => {
      deleteTable(code);
    },
    [deleteTable],
  );

  const confirmDeleteTable = useCallback(
    (table: { code: string; tableName: string }) => {
      Alert.alert(
        'Ширээг устгах уу?',
        `${table.tableName} ширээг устгахдаа итгэлтэй байна уу?`,
        [
          { text: 'Болих', style: 'cancel' },
          { text: 'Устгах', style: 'destructive', onPress: () => handleDeleteTable(table.code) },
        ],
        { cancelable: true },
      );
    },
    [handleDeleteTable],
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[styles.flex, { backgroundColor: theme.background }]}>
            {isNew && (
              <TouchableOpacity onPress={() => setIsNew(false)} style={styles.backBtn}>
                <Icon source="arrow-left" size={24} color="white" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={toggleTheme}
              style={[styles.themeBtn, { borderColor: theme.border, backgroundColor: theme.card }]}
            >
              <Icon source={isDark ? 'weather-sunny' : 'weather-night'} size={32} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.container}>
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
                <View style={styles.tableListWrapper}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tableScroll}
                  >
                    {tables.map((table) => (
                      <TouchableOpacity
                        key={table.code}
                        onPress={() => goTable(table)}
                        onLongPress={() => confirmDeleteTable(table)}
                        activeOpacity={0.8}
                        style={[styles.tableCard, { backgroundColor: theme.card }]}
                      >
                        <Image source={{ uri: table.branchLogo }} style={styles.tableLogo} />
                        <Text style={[styles.branchName, { color: theme.text }]}>{table.branchName}</Text>
                        <Text style={[styles.tableName, { color: theme.textMuted }]}>{table.tableName}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      onPress={() => setIsNew(true)}
                      activeOpacity={0.8}
                      style={[styles.tableCard, styles.addCard, { backgroundColor: theme.primary }]}
                    >
                      <Text style={styles.addIcon}>+</Text>
                      <Text style={styles.addLabel}>Ширээ нэмэх</Text>
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
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  backBtn: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
    backgroundColor: '#b1b1b1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: { alignItems: 'center', justifyContent: 'center' },
  logo: { width: 140, height: 140, marginBottom: 16 },
  form: { width: 300 },
  button: { marginTop: 8, paddingVertical: 6, borderRadius: 8 },
  tableListWrapper: { alignItems: 'center', justifyContent: 'center' },
  tableScroll: { paddingHorizontal: 16, alignItems: 'center' },
  tableCard: {
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
  },
  tableLogo: { width: '100%', height: 100, borderRadius: 12, marginBottom: 12 },
  branchName: { fontWeight: '600', fontSize: 16, textAlign: 'center' },
  tableName: { color: '#888', fontSize: 14, marginTop: 4 },
  addCard: { backgroundColor: defaultColor },
  addIcon: { fontWeight: 'bold', fontSize: 52, color: '#fff' },
  addLabel: { color: '#fff', fontSize: 14, marginTop: 8 },
  themeBtn: { position: 'absolute', top: 20, right: 20, zIndex: 1, padding: 8, borderRadius: 8, borderWidth: 1 },
});
