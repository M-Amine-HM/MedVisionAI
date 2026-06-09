import { useState } from "react";
import { jsPDF } from "jspdf";

const toDataUrl = async (url) => {
    if (!url) {
        return null;
    }
    if (url.startsWith("data:")) {
        return url;
    }
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const combineImages = async (baseUrl, overlayUrl) => {
    if (!baseUrl) {
        return null;
    }

    const [baseData, overlayData] = await Promise.all([
        toDataUrl(baseUrl),
        overlayUrl ? toDataUrl(overlayUrl) : null,
    ]);

    return new Promise((resolve, reject) => {
        const baseImg = new Image();
        baseImg.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = baseImg.width;
            canvas.height = baseImg.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                resolve(baseData);
                return;
            }

            ctx.drawImage(baseImg, 0, 0);

            if (!overlayData) {
                resolve(canvas.toDataURL("image/png"));
                return;
            }

            const overlayImg = new Image();
            overlayImg.onload = () => {
                ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/png"));
            };
            overlayImg.onerror = reject;
            overlayImg.src = overlayData;
        };
        baseImg.onerror = reject;
        baseImg.src = baseData;
    });
};

const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;

const RagReport = ({ report }) => {
    if (!report) return null;

    // Handle fallback raw string (if backend returns string instead of object)
    if (typeof report === "string") {
        return (
            <div className="mt-6 rounded-xl border border-medical-border bg-slate-50 p-4">
                <div className="font-semibold text-medical-text mb-2">AI Generated Report</div>
                <p className="text-sm text-medical-muted">{report}</p>
            </div>
        );
    }

    const sections = [
        { key: "introduction", label: "Introduction", icon: "🔍" },
        { key: "radiological_findings", label: "Radiological Findings", icon: "🫁" },
        { key: "symptoms", label: "Symptoms", icon: "🩺" },
        { key: "severity", label: "Severity Classification", icon: "⚠️" },
        { key: "differential", label: "Differential Diagnosis", icon: "📊" },
        { key: "next_steps", label: "Recommended Next Steps", icon: "📋" },
        { key: "treatment_summary", label: "Treatment Summary", icon: "💊" },
    ];

    return (
        <div className="mt-6 rounded-xl border border-medical-border bg-slate-50 p-4">
            <div className="font-semibold text-medical-text mb-4 text-base">
                🤖 AI Generated Report
            </div>
            <div className="flex flex-col gap-3">
                {sections.map(({ key, label, icon }) =>
                    report[key] ? (
                        <div
                            key={key}
                            className="rounded-lg border border-medical-border bg-white p-3"
                        >
                            <div className="text-xs font-semibold text-medical-primary mb-1">
                                {icon} {label}
                            </div>
                            <p className="text-sm text-medical-text leading-relaxed">
                                {report[key]}
                            </p>
                        </div>
                    ) : null
                )}
                {report.disclaimer && (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                        <p className="text-xs text-yellow-700 italic">
                            ⚠️ {report.disclaimer}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
const ReportSection = ({
    result,
    previewUrl,
    heatmapOverlay,
    classInfo,
    timestamp,
}) => {
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState(null);

    const probabilities = result?.probabilities || {};
    const classOrder = ["Normal", "Pneumonia", "COVID-19", "Tuberculosis"];
    const normalizedProbabilities = classOrder.map((label) => {
        const key = label === "COVID-19" ? "COVID19" : label;
        return {
            label,
            value: probabilities[key] ?? probabilities[label] ?? 0,
        };
    });

    const handleExport = async () => {
        setIsExporting(true);
        setError(null);

        try {
            const doc = new jsPDF({ unit: "pt", format: "a4" });
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 40;
            let y = 48;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.text("ChestAI - Automatic Medical Report", margin, y);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            y += 22;
            doc.text(`Generated: ${timestamp || "N/A"}`, margin, y);
            y += 18;
            doc.text(`Predicted Class: ${result.predicted_class}`, margin, y);
            y += 16;
            doc.text(`Confidence: ${formatPercent(result.confidence)}`, margin, y);
            y += 20;

            doc.setFont("helvetica", "bold");
            doc.text("Confidence Breakdown", margin, y);
            y += 14;

            doc.setFont("helvetica", "normal");
            normalizedProbabilities.forEach((item) => {
                doc.text(
                    `${item.label}: ${formatPercent(item.value)}`,
                    margin,
                    y
                );
                y += 14;
            });

            y += 10;
            doc.setFont("helvetica", "bold");
            doc.text("Images", margin, y);
            y += 12;

            const [originalImage, heatmapImage] = await Promise.all([
                toDataUrl(previewUrl),
                combineImages(previewUrl, heatmapOverlay),
            ]);

            const imageWidth = (pageWidth - margin * 2 - 16) / 2;
            const imageHeight = imageWidth;

            if (originalImage) {
                doc.setFont("helvetica", "normal");
                doc.text("Original X-Ray", margin, y + 12);
                doc.addImage(
                    originalImage,
                    "PNG",
                    margin,
                    y + 18,
                    imageWidth,
                    imageHeight
                );
            }

            if (heatmapImage) {
                doc.text("Heatmap on Original", margin + imageWidth + 16, y + 12);
                doc.addImage(
                    heatmapImage,
                    "PNG",
                    margin + imageWidth + 16,
                    y + 18,
                    imageWidth,
                    imageHeight
                );
            }

            y += imageHeight + 40;

            if (result.rag_report) {
                const report = typeof result.rag_report === "string"
                    ? { introduction: result.rag_report }
                    : result.rag_report;

                const sections = [
                    { key: "introduction", label: "Introduction" },
                    { key: "radiological_findings", label: "Radiological Findings" },
                    { key: "symptoms", label: "Symptoms" },
                    { key: "severity", label: "Severity" },
                    { key: "differential", label: "Differential Diagnosis" },
                    { key: "next_steps", label: "Next Steps" },
                    { key: "treatment_summary", label: "Treatment Summary" },
                    { key: "disclaimer", label: "Disclaimer" },
                ];

                for (const { key, label } of sections) {
                    if (!report[key]) continue;
                    if (y > 750) { doc.addPage(); y = 40; }

                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(11);
                    doc.text(label, margin, y);
                    y += 14;

                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(10);
                    const lines = doc.splitTextToSize(report[key], pageWidth - margin * 2);
                    doc.text(lines, margin, y);
                    y += lines.length * 12 + 8;
                }
            }

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(
                "Disclaimer: For research and educational purposes only. This report is not a medical diagnosis.",
                margin,
                y,
                { maxWidth: pageWidth - margin * 2 }
            );

            doc.save("ChestAI_Report.pdf");
        } catch (err) {
            setError("Failed to generate PDF. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <section className="rounded-xl border border-medical-border bg-white p-6 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-medical-text">
                        Automatic generation of medical reports
                    </h3>
                    <p className="text-sm text-medical-muted">
                        Includes the original X-ray and Grad-CAM heatmap overlay.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleExport}
                    disabled={isExporting}
                    className="rounded-full border border-medical-primary px-4 py-2 text-sm font-semibold text-medical-primary transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                    {isExporting ? "Generating PDF..." : "Export PDF"}
                </button>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-medical-border bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-medical-muted">Original X-Ray</div>
                    <div className="mt-3 overflow-hidden rounded-lg border border-medical-border bg-white">
                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Original X-ray"
                                className="h-64 w-full object-contain"
                            />
                        ) : (
                            <div className="flex h-64 items-center justify-center text-sm text-medical-muted">
                                No image available
                            </div>
                        )}
                    </div>
                </div>
                <div className="rounded-xl border border-medical-border bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-medical-muted">Heatmap on Original</div>
                    <div className="relative mt-3 overflow-hidden rounded-lg border border-medical-border bg-white">
                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Original X-ray with heatmap"
                                className="h-64 w-full object-contain"
                            />
                        ) : (
                            <div className="flex h-64 items-center justify-center text-sm text-medical-muted">
                                No image available
                            </div>
                        )}
                        {heatmapOverlay && (
                            <img
                                src={heatmapOverlay}
                                alt="Heatmap overlay"
                                className="absolute inset-0 h-full w-full object-contain"
                            />
                        )}
                    </div>
                </div>
            </div>
            <RagReport report={result?.rag_report} />

            <div className="mt-6 rounded-xl border border-medical-border bg-slate-50 p-4 text-sm text-medical-muted">
                <div className="font-semibold text-medical-text">Report Summary</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div>Predicted Class: {result.predicted_class}</div>
                    <div>Confidence: {formatPercent(result.confidence)}</div>
                    <div className="sm:col-span-2">Generated: {timestamp || "N/A"}</div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {normalizedProbabilities.map((item) => (
                        <div key={item.label}>
                            {item.label}: {formatPercent(item.value)}
                        </div>
                    ))}
                </div>
            </div>

            {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                </div>
            )}
        </section>
    );
};

export default ReportSection;
