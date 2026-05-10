import { useRef, useState } from "react";

const UploadSection = ({
    selectedFile,
    previewUrl,
    imageMeta,
    isLoading,
    error,
    onFileSelected,
    onAnalyze,
    onClear,
    onTryAgain,
}) => {
    const fileInputRef = useRef(null);
    const [isDragActive, setIsDragActive] = useState(false);

    const handleBrowse = () => {
        fileInputRef.current?.click();
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        setIsDragActive(true);
    };

    const handleDragLeave = () => {
        setIsDragActive(false);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setIsDragActive(false);
        const file = event.dataTransfer.files?.[0];
        if (file) {
            onFileSelected(file);
        }
    };

    const borderClasses = error
        ? "border-red-300 border-l-4 border-l-red-500"
        : "border-medical-border";

    return (
        <section className="bg-medical-bg py-12" id="upload">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-medical-text">Upload X-Ray Image</h2>
                    <p className="mt-2 text-medical-muted">JPEG or PNG format supported.</p>
                </div>
                <div
                    className={`mt-8 rounded-xl border bg-white p-6 shadow-card transition ${borderClasses} ${isDragActive ? "border-medical-primary bg-blue-50" : ""
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                                onFileSelected(file);
                            }
                        }}
                    />

                    {!selectedFile && (
                        <button
                            type="button"
                            onClick={handleBrowse}
                            className={`flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition ${isDragActive
                                    ? "border-medical-primary bg-blue-50"
                                    : "border-slate-300"
                                }`}
                        >
                            <div className={`text-5xl ${isDragActive ? "text-medical-primary" : "text-slate-400"}`}>
                                🫁
                            </div>
                            <div className="text-lg font-semibold text-medical-text">
                                Drag & drop your X-ray image here
                            </div>
                            <div className="text-sm text-medical-muted">or click to browse files</div>
                            <div className="text-xs text-slate-400">Supports: JPG, JPEG, PNG</div>
                        </button>
                    )}

                    {selectedFile && (
                        <div className="space-y-6">
                            <div className="relative overflow-hidden rounded-xl border border-medical-border bg-slate-50">
                                <img
                                    src={previewUrl}
                                    alt="X-ray preview"
                                    className="h-80 w-full object-contain sm:h-96"
                                />
                                <div className="absolute inset-0 medical-grid opacity-5" />
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-medical-muted">
                                    {selectedFile.name}
                                </span>
                                {imageMeta && (
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-medical-muted">
                                        {imageMeta.width} x {imageMeta.height}px · {imageMeta.sizeLabel}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={onAnalyze}
                                    disabled={isLoading}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-medical-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        "🔍 Analyze X-Ray"
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={onClear}
                                    disabled={isLoading}
                                    className="flex-1 rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-medical-muted transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    ✕ Clear
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-card">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <span>{error}</span>
                            <button
                                type="button"
                                onClick={onTryAgain}
                                className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default UploadSection;
