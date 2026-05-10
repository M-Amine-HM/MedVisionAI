import { useState } from "react";
import { motion } from "framer-motion";

const hexToRgba = (hex, alpha) => {
    const normalized = hex.replace("#", "");
    const bigint = parseInt(normalized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const ResultCard = ({
    result,
    classInfo,
    previewUrl,
    heatmapUrl,
    fileName,
    timestamp,
    onReset,
}) => {
    const meta = classInfo[result.predicted_class] || {
        color: "#2563EB",
        icon: "ℹ️",
        message: "Prediction completed. Consult a medical professional for diagnosis.",
    };
    const [showHeatmap, setShowHeatmap] = useState(true);
    const confidencePct = `${(result.confidence * 100).toFixed(1)}%`;
    const classOrder = ["Normal", "Pneumonia", "COVID-19", "Tuberculosis"];
    const markerIndex = Math.max(
        0,
        classOrder.findIndex((item) => item === result.predicted_class)
    );
    const markerLeft = `${(markerIndex + 0.5) * 25}%`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-xl border border-medical-border bg-white p-6 shadow-lg"
            style={{ borderLeft: `6px solid ${meta.color}` }}
        >
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-wide text-medical-muted">
                <span>Classification Result</span>
                <span>{timestamp}</span>
            </div>
            <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <span className="text-5xl">{meta.icon}</span>
                        <div>
                            <div className="text-3xl font-bold" style={{ color: meta.color }}>
                                {result.predicted_class}
                            </div>
                            <div className="text-xs uppercase text-medical-muted">Confidence Score</div>
                        </div>
                    </div>
                    <div className="text-5xl font-bold" style={{ color: meta.color }}>
                        {confidencePct}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="h-28 w-28 overflow-hidden rounded-xl border border-medical-border bg-slate-50">
                        <img
                            src={previewUrl}
                            alt="Uploaded X-ray"
                            className="h-full w-full object-cover"
                        />
                    </div>
                    <div className="text-xs text-medical-muted">
                        <div className="font-semibold text-medical-text">Uploaded Image</div>
                        <div>{fileName}</div>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <div className="relative">
                    <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-medical-muted">
                        {classOrder.map((label) => (
                            <div key={label} className="text-center">
                                {label}
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 flex overflow-hidden rounded-full border border-medical-border">
                        {classOrder.map((label) => (
                            <div
                                key={label}
                                className="h-3 flex-1"
                                style={{ backgroundColor: classInfo[label].color }}
                            />
                        ))}
                    </div>
                    <div
                        className="absolute -top-5 text-lg text-medical-text"
                        style={{ left: markerLeft, transform: "translateX(-50%)" }}
                    >
                        ▼
                    </div>
                </div>
            </div>

            <div
                className="mt-6 rounded-xl border border-transparent px-4 py-4 text-sm"
                style={{ backgroundColor: hexToRgba(meta.color, 0.12), color: meta.color }}
            >
                <div className="flex items-start gap-2">
                    <span className="text-lg">{meta.icon}</span>
                    <div>
                        <p className="font-semibold">{meta.message}</p>
                        <p className="mt-1 text-xs text-medical-muted">
                            ⚠️ Consult a qualified medical professional for proper diagnosis.
                        </p>
                    </div>
                </div>
            </div>

            {heatmapUrl && (
                <div className="mt-6 rounded-xl border border-medical-border bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="text-sm font-semibold text-medical-text">
                                Suspicious Areas Visualization
                            </div>
                            <div className="text-xs text-medical-muted">
                                Grad-CAM overlay from the ResNet model
                            </div>
                        </div>
                        <div className="flex rounded-full border border-medical-border bg-white p-1 text-xs">
                            <button
                                type="button"
                                onClick={() => setShowHeatmap(false)}
                                className={`rounded-full px-3 py-1 ${!showHeatmap
                                        ? "bg-medical-primary text-white"
                                        : "text-medical-muted"
                                    }`}
                            >
                                Original
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowHeatmap(true)}
                                className={`rounded-full px-3 py-1 ${showHeatmap
                                        ? "bg-medical-primary text-white"
                                        : "text-medical-muted"
                                    }`}
                            >
                                Heatmap
                            </button>
                        </div>
                    </div>
                    <div className="mt-4 overflow-hidden rounded-xl border border-medical-border bg-white">
                        <img
                            src={showHeatmap ? heatmapUrl : previewUrl}
                            alt="Suspicious areas visualization"
                            className="h-72 w-full object-contain sm:h-96"
                        />
                    </div>
                </div>
            )}

            <button
                type="button"
                onClick={onReset}
                className="mt-6 w-full rounded-full border border-medical-primary px-4 py-3 text-sm font-semibold text-medical-primary transition hover:bg-blue-50"
            >
                🔄 Analyze Another X-Ray
            </button>
        </motion.div>
    );
};

export default ResultCard;
