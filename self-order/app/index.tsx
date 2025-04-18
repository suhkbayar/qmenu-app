import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { isValidToken } from '@/providers/auth';
import { ActivityIndicator, SafeAreaView } from 'react-native';
import { useValid } from '@/context/ValidContext';

export default function RootPage() {
  const { valid } = useValid();

  // useEffect(() => {
  //   const checkToken = async () => {
  //     const valid = await isValidToken();
  //     setIsValid(valid);
  //   };

  //   checkToken();
  // }, []);

  if (valid === null) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (valid) {
    return <Redirect href="/private" />;
  } else {
    return <Redirect href="/public" />;
  }
}
