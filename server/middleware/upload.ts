import multer from 'multer';
import { Request } from 'express';

// File filter for images
const imageFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP and GIF allowed.'));
  }
};

// File filter for videos
const videoFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['video/mp4', 'video/quicktime', 'video/webm'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only MP4, MOV and WebM allowed.'));
  }
};

// Multer storage in memory (we'll upload to R2 in route handler)
const storage = multer.memoryStorage();

// Image upload middleware - max 10MB
export const uploadImage = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
  },
  fileFilter: imageFilter,
}).single('image');

// Video upload middleware - max 500MB
export const uploadVideo = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
    files: 1,
  },
  fileFilter: videoFilter,
}).single('video');

// Multiple images upload - max 5 files, 10MB each
export const uploadMultipleImages = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
  fileFilter: imageFilter,
}).array('images', 5);
