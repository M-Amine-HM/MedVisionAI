import { useEffect, useMemo, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import Disclaimer from "./components/Disclaimer.jsx";
import ClassesInfo from "./components/ClassesInfo.jsx";
import UploadSection from "./components/UploadSection.jsx";
import ResultCard from "./components/ResultCard.jsx";
import ConfidenceBars from "./components/ConfidenceBars.jsx";
import LoadingOverlay from "./components/LoadingOverlay.jsx";

const CLASS_INFO = [
    {
        label: "Normal",
        color: "#16A34A",
        icon: "✅",
        description: "Healthy lung structure with no signs of disease.",
        message: "No disease detected. Lung structure appears normal.",
    },
    {
        label: "Pneumonia",
        color: "#D97706",
        icon: "⚠️",
        description: "Bacterial or viral lung infection causing inflammation.",
        message: "Signs of Pneumonia detected. Medical consultation recommended.",
    },
    {
        label: "COVID-19",
        color: "#DC2626",
        icon: "🔴",
        description: "Viral infection causing ground-glass opacity patterns.",
        message: "Signs of COVID-19 detected. Immediate medical attention advised.",
    },
    {
        label: "Tuberculosis",
        color: "#7C3AED",
        icon: "🟣",
        description: "Bacterial infection with upper lobe infiltrates.",
        message: "Signs of Tuberculosis detected. Specialist consultation required.",
    },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

const formatBytes = (bytes) => {
    if (bytes === 0) {
        return "0 B";
    }
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const normalizeClassLabel = (label) => {
    if (!label) {
        return "";
    }
    if (label === "COVID19" || label === "COVID-19") {
        return "COVID-19";
    }
    return label;
};

const App = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [imageMeta, setImageMeta] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [analysisTimestamp, setAnalysisTimestamp] = useState("");
    const [error, setError] = useState(null);
    const resultRef = useRef(null);

    const classMap = useMemo(() => {
        return CLASS_INFO.reduce((acc, item) => {
            acc[item.label] = item;
            return acc;
        }, {});
    }, []);

    const validateFile = (file) => {
        const isValidType =
            ALLOWED_TYPES.includes(file.type) ||
            /\.(jpe?g|png)$/i.test(file.name || "");
        if (!isValidType) {
            return "❌ Please upload a JPG or PNG image file.";
        }
        if (file.size > MAX_FILE_SIZE) {
            return "❌ File too large. Please upload an image under 10MB.";
        }
        return null;
    };

    const handleFileSelected = (file) => {
        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            setSelectedFile(null);
            return;
        }
        setError(null);
        setResult(null);
        setSelectedFile(file);
    };

    const handleClear = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setImageMeta(null);
        setResult(null);
        setError(null);
    };

    const handleTryAgain = () => {
        setError(null);
    };

    const handleAnalyze = async () => {
        if (!selectedFile || isLoading) {
            return;
        }

        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            const response = await fetch("/predict", {
                method: "POST",
                body: formData,
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                setError(payload.detail || "❌ Analysis failed. Please try a different image.");
                setIsLoading(false);
                return;
            }

            const normalizedPayload = {
                ...payload,
                predicted_class: normalizeClassLabel(payload.predicted_class),
            };
            setResult(normalizedPayload);
            setAnalysisTimestamp(new Date().toLocaleString());
            setIsLoading(false);
        } catch (err) {
            setError("❌ Cannot connect to server. Please run the backend.");
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!selectedFile) {
            setPreviewUrl(null);
            setImageMeta(null);
            return;
        }

        const objectUrl = URL.createObjectURL(selectedFile);
        setPreviewUrl(objectUrl);

        const img = new Image();
        img.onload = () => {
            setImageMeta({
                width: img.width,
                height: img.height,
                sizeLabel: formatBytes(selectedFile.size),
            });
        };
        img.src = objectUrl;

        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [selectedFile]);

    useEffect(() => {
        if (result && resultRef.current) {
            resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [result]);

    return (
        <div className="min-h-screen bg-medical-bg text-medical-text">
            <Header />
            <main className="pt-16">
                <Hero />
                <Disclaimer />
                <ClassesInfo classes={CLASS_INFO} />
                <UploadSection
                    selectedFile={selectedFile}
                    previewUrl={previewUrl}
                    imageMeta={imageMeta}
                    isLoading={isLoading}
                    error={error}
                    onFileSelected={handleFileSelected}
                    onAnalyze={handleAnalyze}
                    onClear={handleClear}
                    onTryAgain={handleTryAgain}
                />
                {result && (
                    <section
                        ref={resultRef}
                        className="bg-medical-bg pb-12"
                        id="results"
                    >
                        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
                            <ResultCard
                                result={result}
                                classInfo={classMap}
                                previewUrl={previewUrl}
                                heatmapRegions={result.heatmap_regions}
                                fileName={selectedFile?.name}
                                timestamp={analysisTimestamp}
                                onReset={handleClear}
                            />
                            <ConfidenceBars
                                probabilities={result.probabilities}
                                predictedClass={result.predicted_class}
                                classes={classMap}
                            />
                        </div>
                    </section>
                )}
            </main>

            <footer className="border-t border-medical-border bg-white py-6">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-medical-muted sm:flex-row sm:px-6 lg:px-8">
                    <span>ChestAI · Ensemble Deep Learning Classifier</span>
                    <a
                        href="https://github.com/"
                        className="text-medical-primary hover:underline"
                        target="_blank"
                        rel="noreferrer"
                    >
                        GitHub Repository
                    </a>
                    <span>⚠️ Research purposes only</span>
                </div>
            </footer>

            {isLoading && <LoadingOverlay />}
        </div>
    );
};

export default App;
