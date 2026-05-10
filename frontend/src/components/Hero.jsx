const Hero = () => {
    return (
        <section className="bg-white pb-12 pt-24">
            <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
                <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                    🤖 Deep Learning · Ensemble Model · 4 Classes
                </div>
                <h1 className="mt-6 text-3xl font-bold text-medical-text sm:text-4xl lg:text-5xl">
                    Chest X-Ray Disease Classification
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-base text-medical-muted sm:text-lg">
                    Upload a chest X-ray and receive instant AI-powered analysis across 4
                    respiratory conditions using an ensemble deep learning model.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {["TensorFlow", "Ensemble Model", "FastAPI", "React"].map((pill) => (
                        <span
                            key={pill}
                            className="rounded-full border border-medical-border px-4 py-2 text-sm text-medical-muted"
                        >
                            {pill}
                        </span>
                    ))}
                </div>
                <div className="mt-10 grid gap-4 rounded-xl border border-medical-border bg-white px-6 py-5 shadow-card sm:grid-cols-3">
                    <div className="flex flex-col items-center gap-1 text-sm text-medical-muted">
                        <span className="text-xl">📊</span>
                        <span className="font-semibold text-medical-text">4 Disease Classes</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-sm text-medical-muted sm:border-x sm:border-medical-border">
                        <span className="text-xl">🧠</span>
                        <span className="font-semibold text-medical-text">Ensemble Deep Learning</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-sm text-medical-muted">
                        <span className="text-xl">⚡</span>
                        <span className="font-semibold text-medical-text">Real-Time Analysis</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
