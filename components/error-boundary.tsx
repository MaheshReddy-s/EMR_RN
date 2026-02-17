import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { reportCapturedError } from '@/shared/lib/error-reporter';

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Global ErrorBoundary
 * --------------------
 * Catches unhandled React render errors and
 * prevents the entire app from crashing.
 *
 * Shows a user-friendly fallback screen with a
 * "Try Again" button that resets the error state.
 */
interface ErrorBoundaryProps {
    children: React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export default class ErrorBoundary extends React.Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        if (__DEV__) {
            console.error('[ErrorBoundary] Caught error:', error, errorInfo);
        }
        this.props.onError?.(error, errorInfo);
        reportCapturedError(error, errorInfo, 'root-boundary');
    }

    handleReset = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): React.ReactNode {
        if (this.state.hasError) {
            return (
                <View
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: '#FFFFFF',
                        paddingHorizontal: 32,
                    }}
                >
                    <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
                    <Text
                        style={{
                            fontSize: 22,
                            fontWeight: '700',
                            color: '#1F2937',
                            marginBottom: 8,
                            textAlign: 'center',
                        }}
                    >
                        Something went wrong
                    </Text>
                    <Text
                        style={{
                            fontSize: 15,
                            color: '#6B7280',
                            textAlign: 'center',
                            marginBottom: 24,
                            lineHeight: 22,
                        }}
                    >
                        An unexpected error occurred. Please try again or restart the app.
                    </Text>
                    {__DEV__ && this.state.error && (
                        <Text
                            style={{
                                fontSize: 12,
                                color: '#EF4444',
                                textAlign: 'center',
                                marginBottom: 24,
                                fontFamily: 'monospace',
                            }}
                        >
                            {this.state.error.message}
                        </Text>
                    )}
                    <TouchableOpacity
                        onPress={this.handleReset}
                        style={{
                            backgroundColor: '#007AFF',
                            paddingHorizontal: 32,
                            paddingVertical: 14,
                            borderRadius: 12,
                        }}
                    >
                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                            Try Again
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}
