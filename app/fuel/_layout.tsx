import { Stack } from 'expo-router';

export default function FuelLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="add" />
    </Stack>
  );
}
