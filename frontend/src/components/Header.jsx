import { useEffect, useState } from "react";

const Header = () => {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 8);
        };

        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header
            className={`fixed inset-x-0 top-0 z-50 border-b border-medical-border bg-white transition-shadow ${isScrolled ? "shadow-sm" : ""
                }`}
        >
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🫁</span>
                    <div>
                        <div className="text-lg font-bold text-medical-primary">ChestAI</div>
                        <div className="text-xs text-medical-muted">
                            X-Ray Classification System
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-medical-muted">
                        Research Project
                    </span>
                    <a
                        href="https://github.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-medical-border text-medical-muted transition hover:border-medical-primary hover:text-medical-primary"
                        aria-label="Open GitHub repository"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            className="h-5 w-5"
                            fill="currentColor"
                        >
                            <path d="M12 2C6.477 2 2 6.484 2 12.02c0 4.424 2.865 8.18 6.839 9.504.5.092.682-.218.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.621.069-.609.069-.609 1.004.071 1.532 1.032 1.532 1.032.892 1.53 2.341 1.089 2.91.833.091-.647.35-1.089.636-1.34-2.221-.255-4.556-1.113-4.556-4.953 0-1.094.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.504 9.504 0 0112 6.844a9.5 9.5 0 012.504.337c1.909-1.296 2.747-1.026 2.747-1.026.546 1.378.202 2.397.099 2.65.64.7 1.028 1.594 1.028 2.688 0 3.85-2.338 4.695-4.566 4.945.36.31.68.923.68 1.86 0 1.342-.012 2.425-.012 2.754 0 .268.18.58.688.482A10.02 10.02 0 0022 12.02C22 6.484 17.523 2 12 2z" />
                        </svg>
                    </a>
                </div>
            </div>
        </header>
    );
};

export default Header;
