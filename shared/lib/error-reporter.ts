import type React from 'react';

type ErrorReporter = (error: Error, errorInfo: React.ErrorInfo, scope: string) => void;

let reporter: ErrorReporter | null = null;

export function setErrorReporter(nextReporter: ErrorReporter | null): void {
    reporter = nextReporter;
}

export function reportCapturedError(error: Error, errorInfo: React.ErrorInfo, scope: string): void {
    if (reporter) {
        reporter(error, errorInfo, scope);
    }
}

