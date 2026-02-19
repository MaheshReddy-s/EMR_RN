import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Text, TouchableOpacity, View } from 'react-native';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { WebView } from 'react-native-webview';

interface PdfViewerProps {
    uri: string;
    title?: string;
}

const ANDROID_PDF_DATA_PREFIX = 'data:application/pdf;base64,';
const PDF_JS_CDN_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174';

function buildAndroidPdfJsHtml(base64: string) {
    const safeBase64 = JSON.stringify(base64);
    const workerSrc = `${PDF_JS_CDN_BASE}/pdf.worker.min.js`;
    const scriptSrc = `${PDF_JS_CDN_BASE}/pdf.min.js`;

    return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <style>
      body {
        margin: 0;
        padding: 8px;
        background: #f3f4f6;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      #status {
        color: #6b7280;
        text-align: center;
        padding: 24px;
      }
      #viewer {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .page {
        background: #fff;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
        border-radius: 4px;
        overflow: hidden;
      }
      canvas {
        width: 100%;
        height: auto;
        display: block;
      }
    </style>
  </head>
  <body>
    <div id="status">Loading PDF…</div>
    <div id="viewer"></div>

    <script>
      function postError(message) {
        const payload = JSON.stringify({ type: 'error', message: String(message || 'Unknown PDF error') });
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(payload);
        }
      }

      function setStatus(text) {
        const el = document.getElementById('status');
        if (el) el.textContent = text;
      }

      function b64ToBytes(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      }

      function onPdfJsLoadError() {
        setStatus('PDF renderer failed to load.');
        postError('PDF.js script failed to load');
      }

      window.addEventListener('error', function (event) {
        postError(event && event.message ? event.message : 'Script error');
      });
    </script>

    <script src="${scriptSrc}" onerror="onPdfJsLoadError()"></script>
    <script>
      (async function renderPdf() {
        try {
          if (!window.pdfjsLib) {
            throw new Error('PDF.js not available');
          }

          const base64 = ${safeBase64};
          if (!base64) {
            throw new Error('Missing PDF data');
          }

          window.pdfjsLib.GlobalWorkerOptions.workerSrc = ${JSON.stringify(workerSrc)};
          const pdf = await window.pdfjsLib.getDocument({ data: b64ToBytes(base64) }).promise;
          const viewer = document.getElementById('viewer');

          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const baseViewport = page.getViewport({ scale: 1 });
            const maxWidth = Math.max(320, window.innerWidth - 16);
            const scale = maxWidth / baseViewport.width;
            const viewport = page.getViewport({ scale: scale });

            const wrapper = document.createElement('div');
            wrapper.className = 'page';
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            wrapper.appendChild(canvas);
            viewer.appendChild(wrapper);

            await page.render({
              canvasContext: context,
              viewport: viewport
            }).promise;
          }

          setStatus('');
        } catch (error) {
          setStatus('Unable to render PDF.');
          postError(error && error.message ? error.message : String(error));
        }
      })();
    </script>
  </body>
</html>
`;
}

/**
 * Cross-platform PDF viewer component.
 * - Web: Uses an iframe to display PDFs natively.
 * - Native (iOS/Android): Uses react-native-webview with specific configuration for PDFs.
 */
export default function PdfViewer({ uri, title = 'Document' }: PdfViewerProps) {
    const [sourceUri, setSourceUri] = useState(uri);
    const [androidBase64, setAndroidBase64] = useState<string | null>(null);
    const [isPreparingAndroidPdf, setIsPreparingAndroidPdf] = useState(false);
    const [androidPrepareError, setAndroidPrepareError] = useState<string | null>(null);
    const [androidRenderError, setAndroidRenderError] = useState<string | null>(null);

    const needsAndroidCustomRenderer = Platform.OS === 'android'
        && (uri.startsWith('file://') || uri.startsWith(ANDROID_PDF_DATA_PREFIX));

    const openExternally = useCallback(async () => {
        if (Platform.OS !== 'android') return;

        try {
            let targetUri = uri;
            if (targetUri.startsWith('file://')) {
                try {
                    targetUri = await FileSystemLegacy.getContentUriAsync(targetUri);
                } catch {
                    // Fallback to file:// URI if content URI conversion fails.
                }
            }
            await Linking.openURL(targetUri);
        } catch (error) {
            try {
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
                    return;
                }
            } catch {
                // noop
            }

            if (__DEV__) console.error('Failed to open Android PDF externally:', error);
        }
    }, [uri]);

    useEffect(() => {
        setSourceUri(uri);
        setAndroidBase64(null);
        setAndroidPrepareError(null);
        setAndroidRenderError(null);

        if (needsAndroidCustomRenderer) {
            if (uri.startsWith(ANDROID_PDF_DATA_PREFIX)) {
                setAndroidBase64(uri.slice(ANDROID_PDF_DATA_PREFIX.length));
                return;
            }

            let isCancelled = false;
            const loadAndroidPdf = async () => {
                setIsPreparingAndroidPdf(true);
                try {
                    const encoding = FileSystemLegacy.EncodingType?.Base64 || 'base64';
                    const base64 = await FileSystemLegacy.readAsStringAsync(uri, {
                        encoding,
                    });
                    if (!isCancelled) setAndroidBase64(base64);
                } catch (e) {
                    if (!isCancelled) {
                        setAndroidPrepareError('Failed to prepare PDF for Android preview.');
                    }
                    if (__DEV__) console.error('Failed to prepare Android PDF:', e);
                } finally {
                    if (!isCancelled) setIsPreparingAndroidPdf(false);
                }
            };

            void loadAndroidPdf();
            return () => {
                isCancelled = true;
            };
        }

        setIsPreparingAndroidPdf(false);
    }, [uri, needsAndroidCustomRenderer]);

    const androidPdfHtml = useMemo(
        () => (androidBase64 ? buildAndroidPdfJsHtml(androidBase64) : null),
        [androidBase64]
    );

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

    if (Platform.OS === 'android' && needsAndroidCustomRenderer) {
        if (isPreparingAndroidPdf) {
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={{ marginTop: 10, color: '#6B7280' }}>Preparing PDF...</Text>
                </View>
            );
        }

        if (androidPdfHtml) {
            return (
                <View style={{ flex: 1, backgroundColor: '#fff' }}>
                    <WebView
                        source={{ html: androidPdfHtml }}
                        style={{ flex: 1 }}
                        originWhitelist={['*']}
                        javaScriptEnabled
                        domStorageEnabled
                        startInLoadingState
                        onMessage={(event: any) => {
                            try {
                                const payload = JSON.parse(event.nativeEvent?.data || '{}');
                                if (payload?.type === 'error') {
                                    setAndroidRenderError(payload.message || 'Failed to render PDF.');
                                }
                            } catch {
                                // ignore malformed events
                            }
                        }}
                        androidLayerType="hardware"
                    />
                    {androidRenderError ? (
                        <View style={{ padding: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                            <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>
                                Preview failed on this device. Open with external app.
                            </Text>
                            <TouchableOpacity onPress={openExternally} style={{ alignSelf: 'flex-start' }}>
                                <Text style={{ color: '#2563EB', fontWeight: '600' }}>Open PDF</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}
                </View>
            );
        }

        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                <Text style={{ fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 12 }}>
                    {androidPrepareError || 'Unable to load PDF preview on Android.'}
                </Text>
                <TouchableOpacity onPress={openExternally}>
                    <Text style={{ color: '#2563EB', fontWeight: '600' }}>Open PDF</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // iOS path: WKWebView handles PDFs natively.
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
}
