import { AuthRepository } from '@/repositories';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Error', 'Please enter your email and password');
            return;
        }

        setIsLoading(true);
        try {
            await AuthRepository.login(email.trim(), password);
            router.replace('/(app)/dashboard');
        } catch (error: any) {
            if (__DEV__) console.error('Login error:', error);
            Alert.alert(
                'Login Failed',
                error.message || 'Invalid email or password. Please try again.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ImageBackground
            source={require('../../assets/images/login-bg.png')}
            className="flex-1 justify-center items-center"
            resizeMode="cover"
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="w-full justify-center items-center"
            >
                {/* Main Content Container - 70% width */}
                <View className="w-[70%] items-center">

                    {/* Logo - No Background */}
                    <Image
                        source={require('../../assets/images/logo.png')}
                        className="w-[150px] h-[150px] mb-[10px]"
                        resizeMode="contain"
                    />

                    {/* Login Title */}
                    <Text className="text-[33px] font-bold text-black mb-[30px]">
                        Login
                    </Text>

                    {/* Username Field */}
                    <View className="w-full h-[50px] bg-white border border-gray-300 rounded-[4px] mb-[20px] justify-center">
                        <TextInput
                            className="flex-1 text-[16px] text-black px-3"
                            placeholder="Email"
                            placeholderTextColor="#999"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            value={email}
                            onChangeText={setEmail}
                            editable={!isLoading}
                        />
                    </View>

                    {/* Password Field */}
                    <View className="w-full h-[50px] bg-white border border-gray-300 rounded-[4px] mb-[32px] justify-center">
                        <TextInput
                            className="flex-1 text-[16px] text-black px-3"
                            placeholder="Password"
                            placeholderTextColor="#999"
                            secureTextEntry
                            autoCapitalize="none"
                            value={password}
                            onChangeText={setPassword}
                            onSubmitEditing={handleLogin}
                            editable={!isLoading}
                        />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        className={`w-full h-[50px] rounded-[4px] justify-center items-center ${isLoading ? 'bg-blue-300' : 'bg-blue-500'}`}
                        onPress={handleLogin}
                        activeOpacity={0.8}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white text-[18px] font-medium">
                                Submit
                            </Text>
                        )}
                    </TouchableOpacity>

                </View>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
}
