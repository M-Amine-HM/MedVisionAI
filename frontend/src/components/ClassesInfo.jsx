const ClassesInfo = ({ classes }) => {
    return (
        <section className="bg-medical-bg py-12">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-medical-text">Detectable Conditions</h2>
                    <p className="mt-2 text-medical-muted">
                        The model classifies X-rays into 4 categories.
                    </p>
                </div>
                <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {classes.map((item) => (
                        <div
                            key={item.label}
                            className="group flex h-full flex-col justify-between rounded-xl border border-medical-border border-l-[4px] bg-white p-5 shadow-card transition duration-200 hover:-translate-y-1 hover:border-l-[6px]"
                            style={{ borderLeftColor: item.color }}
                        >
                            <div>
                                <div className="text-3xl">{item.icon}</div>
                                <h3 className="mt-3 text-lg font-semibold text-medical-text">
                                    {item.label}
                                </h3>
                                <p className="mt-2 text-sm text-medical-muted">
                                    {item.description}
                                </p>
                            </div>
                            <span
                                className="mt-4 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold text-white"
                                style={{ backgroundColor: item.color }}
                            >
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ClassesInfo;
