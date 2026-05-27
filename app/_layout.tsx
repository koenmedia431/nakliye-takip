import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { DataProvider } from '../hooks/useData';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LoadingScreen from '../components/LoadingScreen';

function RootLayoutNav() {
  const { firebaseUser, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!firebaseUser && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (firebaseUser && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [firebaseUser, loading, segments]);

  if (loading) return <LoadingScreen />;
  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <DataProvider>
          <RootLayoutNav />
        </DataProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
