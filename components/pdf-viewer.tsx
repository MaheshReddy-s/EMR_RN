import React, { useEffect, useState } from 'react';
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
    const [sourceUri, setSourceUri] = useState(uri);

    useEffect(() => {
        if (Platform.OS === 'android' && uri.startsWith('file://')) {
            const loadAndroidPdf = async () => {
                try {
                    const FileSystem = require('expo-file-system/legacy');
                    const base64 = await FileSystem.readAsStringAsync(uri, {
                        encoding: 'base64',
                    });
                    setSourceUri(`data:application/pdf;base64,${base64}`);
                } catch (e) {
                    console.error('Failed to prepare Android PDF:', e);
                }
            };
            loadAndroidPdf();
        } else {
            setSourceUri(uri);
        }
    }, [uri]);

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
        // On Android, we use a data URI for local files to work around WebView limitations.
        return (
            <View style={{ flex: 1, backgroundColor: 'white' }}>
                <WebView
                    source={{ uri: sourceUri }}
                    style={{ flex: 1 }}
                    startInLoadingState
                    originWhitelist={['*']}
                    allowFileAccess={true}
                    allowFileAccessFromFileURLs={true}
                    allowUniversalAccessFromFileURLs={true}
                    scalesPageToFit={true}
                    bounces={false}
                    scrollEnabled={true}
                    // Improve Android rendering
                    androidLayerType="hardware"
                    mixedContentMode="always"
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
