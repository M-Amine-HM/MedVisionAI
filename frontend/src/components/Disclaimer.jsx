import { useState } from "react";

const Disclaimer = () => {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) {
        return null;
    }

    return (
        <section className="bg-white">
            <div className="mx-auto max-w-5xl px-4 pb-6 sm:px-6 lg:px-8">
                <div className="flex items-start justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900 shadow-card">
                    <div className="flex gap-3">
                        <span className="text-lg text-amber-600">⚠️</span>
                        <p>
                            For research and educational purposes only. This tool is not a
                            substitute for professional medical diagnosis. Always consult a
                            qualified healthcare provider.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsVisible(false)}
                        className="rounded-full border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                        aria-label="Dismiss disclaimer"
                    >
                        ✕
                    </button>
                </div>
            </div>
        </section>
    );
};

export default Disclaimer;
