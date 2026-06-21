import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ImageIcon } from 'lucide-react';

interface MenuViewerProps {
    images: { id: string; image_url: string; title?: string }[];
    pdfUrl?: string | null;
    fallbackImage?: string;
    isOpen: boolean;
    onClose: () => void;
    initialIndex?: number;
}

const MenuViewer = ({ images, pdfUrl, fallbackImage, isOpen, onClose, initialIndex = 0 }: MenuViewerProps) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoom, setZoom] = useState(1);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchDelta, setTouchDelta] = useState(0);
    const modalRef = useRef<HTMLDivElement>(null);
    const prevFocusRef = useRef<HTMLElement | null>(null);

    const hasMultipleImages = images.length > 1;
    const currentImage = images[currentIndex];

    useEffect(() => {
        if (isOpen) {
            prevFocusRef.current = document.activeElement as HTMLElement;
            document.body.style.overflow = 'hidden';
            setCurrentIndex(initialIndex);
            setZoom(1);
            setIsImageLoaded(false);
            setTimeout(() => modalRef.current?.focus(), 50);
        } else {
            document.body.style.overflow = '';
            prevFocusRef.current?.focus();
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, initialIndex]);

    const goNext = useCallback(() => {
        if (currentIndex < images.length - 1) {
            setCurrentIndex(i => i + 1);
            setZoom(1);
            setIsImageLoaded(false);
        }
    }, [currentIndex, images.length]);

    const goPrev = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(i => i - 1);
            setZoom(1);
            setIsImageLoaded(false);
        }
    }, [currentIndex]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'Escape':
                onClose();
                break;
            case 'ArrowLeft':
                goPrev();
                break;
            case 'ArrowRight':
                goNext();
                break;
            case '+':
            case '=':
                setZoom(z => Math.min(z + 0.25, 3));
                break;
            case '-':
                setZoom(z => Math.max(z - 0.25, 0.5));
                break;
        }
    }, [onClose, goNext, goPrev]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom(z => Math.max(0.5, Math.min(3, z - e.deltaY * 0.01)));
        }
    }, []);

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.touches[0].clientX);
        setTouchDelta(0);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStart === null) return;
        setTouchDelta(e.touches[0].clientX - touchStart);
    };

    const handleTouchEnd = () => {
        if (touchDelta < -80) goNext();
        else if (touchDelta > 80) goPrev();
        setTouchStart(null);
        setTouchDelta(0);
    };

    if (!isOpen) return null;

    const focusableElements = (el: HTMLElement) => {
        const focusable = el.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        return focusable;
    };

    const handleTabKey = (e: React.KeyboardEvent) => {
        if (e.key !== 'Tab' || !modalRef.current) return;
        const focusable = focusableElements(modalRef.current);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="Menu viewer"
            ref={modalRef}
            tabIndex={-1}
            onKeyDown={(e) => { handleKeyDown(e); handleTabKey(e); }}
        >
            <div
                className="absolute inset-0 bg-black/90 backdrop-blur-sm"
                onClick={onClose}
                style={{
                    animation: 'fadeIn 200ms ease-out'
                }}
            />

            <div
                className="relative z-10 w-full h-full flex flex-col"
                style={{
                    animation: 'scaleIn 250ms cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/50 to-transparent">
                    <div className="text-white text-sm font-medium">
                        {images.length > 0 ? `${currentIndex + 1} / ${images.length}` : ''}
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Zoom out"
                            title="Zoom out"
                        >
                            <ZoomOut size={20} />
                        </button>
                        <button
                            onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Zoom in"
                            title="Zoom in"
                        >
                            <ZoomIn size={20} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Close menu viewer"
                            title="Close (ESC)"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div
                    className="flex-1 flex items-center justify-center p-4 select-none"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onWheel={handleWheel}
                >
                    {currentImage ? (
                        <div className="relative flex items-center justify-center w-full h-full">
                            {!isImageLoaded && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                </div>
                            )}
                            <img
                                src={currentImage.image_url}
                                alt={currentImage.title || `Menu page ${currentIndex + 1}`}
                                className="max-w-full max-h-full object-contain transition-transform duration-200 ease-out"
                                style={{
                                    transform: `scale(${zoom})`,
                                    opacity: isImageLoaded ? 1 : 0,
                                    touchAction: 'none',
                                    transformOrigin: 'center center',
                                }}
                                onLoad={() => setIsImageLoaded(true)}
                                draggable={false}
                            />
                            {touchStart !== null && (
                                <div
                                    className="absolute inset-y-0 w-1 bg-white/30 rounded-full"
                                    style={{
                                        left: '50%',
                                        transform: `translateX(calc(-50% + ${touchDelta * 0.3}px))`,
                                        opacity: Math.min(1, Math.abs(touchDelta) / 100),
                                        transition: touchDelta === 0 ? 'none' : undefined,
                                    }}
                                />
                            )}
                        </div>
                    ) : pdfUrl ? (
                        <iframe
                            src={pdfUrl}
                            className="w-full h-full max-w-4xl rounded-lg"
                            title="Menu PDF"
                            style={{ border: 'none' }}
                        />
                    ) : fallbackImage ? (
                        <div className="relative flex items-center justify-center w-full h-full">
                            {!isImageLoaded && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                </div>
                            )}
                            <img
                                src={fallbackImage}
                                alt="Menu"
                                className="max-w-full max-h-full object-contain transition-transform duration-200 ease-out"
                                style={{
                                    transform: `scale(${zoom})`,
                                    opacity: isImageLoaded ? 1 : 0,
                                }}
                                onLoad={() => setIsImageLoaded(true)}
                                draggable={false}
                            />
                        </div>
                    ) : (
                        <div className="text-center text-white/60">
                            <ImageIcon size={64} className="mx-auto mb-4" />
                            <p className="text-lg">No menu images available</p>
                        </div>
                    )}
                </div>

                {hasMultipleImages && (
                    <>
                        {currentIndex > 0 && (
                            <button
                                onClick={goPrev}
                                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all hover:scale-110"
                                aria-label="Previous menu page"
                            >
                                <ChevronLeft size={28} />
                            </button>
                        )}
                        {currentIndex < images.length - 1 && (
                            <button
                                onClick={goNext}
                                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all hover:scale-110"
                                aria-label="Next menu page"
                            >
                                <ChevronRight size={28} />
                            </button>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center gap-2 pb-4 pt-8 bg-gradient-to-t from-black/50 to-transparent">
                            {images.map((img, i) => (
                                <button
                                    key={img.id}
                                    onClick={() => { setCurrentIndex(i); setZoom(1); setIsImageLoaded(false); }}
                                    className={`w-14 h-10 rounded-md overflow-hidden border-2 transition-all ${i === currentIndex
                                        ? 'border-white scale-110 shadow-lg'
                                        : 'border-white/30 opacity-60 hover:opacity-100'
                                        }`}
                                    aria-label={`Go to menu page ${i + 1}`}
                                >
                                    <img
                                        src={img.image_url}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        draggable={false}
                                    />
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default MenuViewer;
