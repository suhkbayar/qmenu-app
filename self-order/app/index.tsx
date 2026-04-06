import { Redirect } from 'expo-router';
import { ActivityIndicator, SafeAreaView } from 'react-native';
import { useValid } from '@/src/providers/ValidProvider';

export default function RootPage() {
  const { valid } = useValid();

  if (valid === null) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return <Redirect href={valid ? '/private' : '/public'} />;
}
