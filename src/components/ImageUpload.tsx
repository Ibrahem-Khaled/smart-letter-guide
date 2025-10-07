import React, { useState, useRef } from 'react';
import './ImageUpload.css';

interface ImageUploadProps {
  label: string;
  currentImage?: string;
  onImageChange: (imagePath: string | null) => void;
  accept?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  currentImage,
  onImageChange,
  accept = "image/*"
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreview(result);
        
        // إنشاء مسار محلي للصورة
        // const fileName = `${Date.now()}-${file.name}`;
        
        // حفظ الصورة في مجلد public/letter-images
        // في التطبيق الحقيقي، ستحتاج إلى رفع الصورة إلى الخادم
        // هنا سنستخدم URL.createObjectURL للعرض المؤقت
        const objectUrl = URL.createObjectURL(file);
        onImageChange(objectUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const removeImage = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="image-upload-container">
      <label className="image-upload-label">{label}</label>
      
      <div
        className={`image-upload-area ${isDragging ? 'dragging' : ''} ${preview ? 'has-image' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />
        
        {preview ? (
          <div className="image-preview-container">
            <img src={preview} alt="Preview" className="image-preview" />
            <button
              type="button"
              className="remove-image-btn"
              onClick={(e) => {
                e.stopPropagation();
                removeImage();
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="upload-placeholder">
            <div className="upload-icon">📷</div>
            <div className="upload-text">
              <p>اسحب وأفلت الصورة هنا</p>
              <p>أو انقر للاختيار</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
