import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { isValidToken } from '@/providers/auth';
import { ActivityIndicator, SafeAreaView } from 'react-native';

export default function RootPage() {
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      const valid = await isValidToken();
      setIsValid(valid);
    };

    checkToken();
  }, []);

  if (isValid === null) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (isValid) {
    return <Redirect href="/private" />;
  } else {
    return <Redirect href="/public" />;
  }
}
