import React from 'react';
import './ImageViewer.css';

interface ImageViewerProps {
	images: string[];
	currentIndex: number;
	onClose: () => void;
	onNext?: () => void;
	onPrev?: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ 
	images, 
	currentIndex, 
	onClose, 
	onNext, 
	onPrev 
}) => {
	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	return (
		<div className="image-viewer" onClick={handleBackdropClick}>
			<div className="image-viewer__container">
				{/* Close Button */}
				<button 
					className="image-viewer__close"
					onClick={onClose}
					aria-label="Đóng"
				>
					✕
				</button>

				{/* Image Counter */}
				{images.length > 1 && (
					<div className="image-viewer__counter">
						{currentIndex + 1} / {images.length}
					</div>
				)}

				{/* Previous Button */}
				{images.length > 1 && currentIndex > 0 && (
					<button 
						className="image-viewer__nav image-viewer__nav--prev"
						onClick={onPrev}
						aria-label="Ảnh trước"
					>
						‹
					</button>
				)}

				{/* Image */}
				<div className="image-viewer__image-wrapper">
					<img 
						src={images[currentIndex]} 
						alt={`Ảnh ${currentIndex + 1}`}
						className="image-viewer__image"
					/>
				</div>

				{/* Next Button */}
				{images.length > 1 && currentIndex < images.length - 1 && (
					<button 
						className="image-viewer__nav image-viewer__nav--next"
						onClick={onNext}
						aria-label="Ảnh tiếp theo"
					>
						›
					</button>
				)}
			</div>
		</div>
	);
};

export default ImageViewer;
