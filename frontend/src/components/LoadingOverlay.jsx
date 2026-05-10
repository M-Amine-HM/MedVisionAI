import { useEffect, useState } from "react";

const messages = [
    "Processing image...",
    "Running deep learning model...",
    "Calculating confidence scores...",
];

const LoadingOverlay = () => {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % messages.length);
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm">
            <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-medical-border bg-white p-8 text-center shadow-card">
                <div className="text-5xl text-medical-primary animate-pulse">🫁</div>
                <div>
                    <div className="text-lg font-semibold text-medical-primary">
                        Analyzing X-Ray...
                    </div>
                    <div className="text-sm text-medical-muted">
                        Running ensemble model inference
                    </div>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 indeterminate-bar" />
                <div className="text-xs text-medical-muted">{messages[messageIndex]}</div>
            </div>
        </div>
    );
};

export default LoadingOverlay;
