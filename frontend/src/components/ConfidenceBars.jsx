import { motion } from "framer-motion";

const ConfidenceBars = ({ probabilities, predictedClass, classes }) => {
    const classOrder = ["Normal", "Pneumonia", "COVID-19", "Tuberculosis"];

    const getProbability = (label) => {
        if (!probabilities) {
            return 0;
        }
        if (label === "COVID-19") {
            return probabilities.COVID19 ?? probabilities["COVID-19"] ?? 0;
        }
        return probabilities[label] ?? 0;
    };

    const rows = classOrder
        .map((label) => {
            const meta = classes[label];
            return {
                label,
                icon: meta.icon,
                color: meta.color,
                value: getProbability(label),
            };
        })
        .sort((a, b) => b.value - a.value);

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-xl border border-medical-border bg-white p-6 shadow-card"
        >
            <div>
                <h3 className="text-lg font-bold text-medical-text">Confidence Breakdown</h3>
                <p className="text-sm text-medical-muted">
                    Model confidence across all 4 classes.
                </p>
            </div>
            <div className="mt-6 space-y-4">
                {rows.map((row) => {
                    const isPredicted = row.label === predictedClass;
                    const percent = Math.max(0, Math.min(100, row.value * 100));
                    return (
                        <div
                            key={row.label}
                            className={`rounded-xl border px-4 py-3 ${isPredicted
                                    ? "border-transparent"
                                    : "border-medical-border bg-white"
                                }`}
                            style={
                                isPredicted
                                    ? {
                                        backgroundColor: `${row.color}1A`,
                                        borderLeft: `4px solid ${row.color}`,
                                    }
                                    : undefined
                            }
                        >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">{row.icon}</span>
                                    <div
                                        className={`font-semibold text-medical-text ${isPredicted ? "text-base" : "text-sm"
                                            }`}
                                    >
                                        {row.label}
                                    </div>
                                    {isPredicted && (
                                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                                            Predicted
                                        </span>
                                    )}
                                </div>
                                <div
                                    className={`font-semibold ${isPredicted ? "text-base text-medical-text" : "text-sm text-medical-muted"
                                        }`}
                                >
                                    {percent.toFixed(1)}%
                                </div>
                            </div>
                            <div className="mt-3 h-3 w-full rounded-full bg-slate-200">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percent}%` }}
                                    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                                    className="h-3 rounded-full"
                                    style={{ backgroundColor: row.color, opacity: isPredicted ? 1 : 0.7 }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
};

export default ConfidenceBars;
