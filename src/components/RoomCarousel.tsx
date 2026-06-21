import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface RoomCarouselProps {
    images: { id: string; url: string }[];
    roomName: string;
}

const RoomCarousel = ({ images, roomName }: RoomCarouselProps) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!images || images.length === 0) {
        return (
            <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-400">No images available</span>
            </div>
        );
    }

    if (images.length === 1) {
        return (
            <div className="aspect-video rounded-lg overflow-hidden">
                <img
                    src={images[0].url}
                    alt={roomName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
            </div>
        );
    }

    const nextSlide = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    };

    const prevSlide = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
    };

    return (
        <div className="relative aspect-video rounded-lg overflow-hidden group">
            {/* Images */}
            <div
                className="flex transition-transform duration-500 ease-out h-full"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {images.map((img) => (
                    <img
                        key={img.id}
                        src={img.url}
                        alt={roomName}
                        className="w-full h-full object-cover flex-shrink-0"
                        loading="lazy"
                    />
                ))}
            </div>

            {/* Navigation Arrows */}
            <button
                onClick={prevSlide}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
                <ChevronLeft size={20} />
            </button>
            <button
                onClick={nextSlide}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
                <ChevronRight size={20} />
            </button>

            {/* Dots / Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                {images.map((_, index) => (
                    <button
                        key={index}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCurrentIndex(index);
                        }}
                        className={`w-2 h-2 rounded-full transition-all ${currentIndex === index ? 'bg-white w-4' : 'bg-white/50'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};

export default RoomCarousel;
