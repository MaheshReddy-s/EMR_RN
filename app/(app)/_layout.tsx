import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSessionStore } from '@/stores/session-store';

export default function AppLayout() {
    const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
    const isRestoring = useSessionStore((state) => state.isRestoring);

    if (isRestoring) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
                <ActivityIndicator size="large" color="#3b69ccff" />
            </View>
        );
    }

    if (!isAuthenticated) {
        return <Redirect href="/(auth)/login" />;
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="consultation/[patientId]" />
        </Stack>
    );
}
