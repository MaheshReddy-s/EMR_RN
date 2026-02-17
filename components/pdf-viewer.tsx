import React from 'react';
import { Platform, View, Text } from 'react-native';

interface PdfViewerProps {
    uri: string;
    title?: string;
}

/**
 * Cross-platform PDF viewer component.
 * - Web: Uses an iframe to display PDFs natively.
 * - Native (iOS/Android): Uses react-native-webview with specific configuration for PDFs.
 */
export default function PdfViewer({ uri, title = 'Document' }: PdfViewerProps) {
    if (Platform.OS === 'web') {
        return (
            <View style={{ flex: 1 }}>
                <iframe
                    src={uri}
                    title={title}
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        borderRadius: 8,
                    }}
                />
            </View>
        );
    }

    // Native fallback — use WebView if available
    try {
        const WebView = require('react-native-webview').default;

        // On iOS, WKWebView handles PDFs natively. 
        // We need to ensure local file access is allowed.
        return (
            <View style={{ flex: 1, backgroundColor: 'white' }}>
                <WebView
                    source={{ uri }}
                    style={{ flex: 1 }}
                    startInLoadingState
                    // Essential for local PDF files on iOS/Android
                    originWhitelist={['*']}
                    allowFileAccess={true}
                    allowFileAccessFromFileURLs={true}
                    allowUniversalAccessFromFileURLs={true}
                    scalesPageToFit={true}
                    bounces={false}
                    scrollEnabled={true}
                />
            </View>
        );
    } catch {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center' }}>
                    PDF viewing is not available on this device.
                </Text>
            </View>
        );
    }
}
