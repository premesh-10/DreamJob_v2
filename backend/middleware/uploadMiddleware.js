import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Ensure upload directories exist ──────────────────────────────────────────
const uploadsBase = path.join(__dirname, '..', 'uploads');
const dirs = ['thumbnails', 'videos', 'pdfs', 'resources', 'avatars'];
dirs.forEach(dir => {
    const fullPath = path.join(uploadsBase, dir);
    if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

// ── Storage engine factory ────────────────────────────────────────────────────
const makeStorage = (subfolder) => multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(uploadsBase, subfolder));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

// ── File filters ──────────────────────────────────────────────────────────────
const imageFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed for thumbnails'), false);
};

const videoFilter = (req, file, cb) => {
    const allowed = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/quicktime', 'video/x-matroska'];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith('video/')) return cb(null, true);
    cb(new Error('Only video files are allowed'), false);
};

const pdfFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Only PDF files are allowed'), false);
};

const resourceFilter = (req, file, cb) => {
    const allowed = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain'
    ];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('File type not supported'), false);
};

// ── Multer instances ──────────────────────────────────────────────────────────
export const uploadThumbnail = multer({
    storage: makeStorage('thumbnails'),
    fileFilter: imageFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
}).single('thumbnail');

export const uploadVideo = multer({
    storage: makeStorage('videos'),
    fileFilter: videoFilter,
    limits: { fileSize: 500 * 1024 * 1024 } // 500 MB
}).single('video');

export const uploadPDF = multer({
    storage: makeStorage('pdfs'),
    fileFilter: pdfFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
}).single('pdf');

export const uploadResource = multer({
    storage: makeStorage('resources'),
    fileFilter: resourceFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
}).single('resource');

export const uploadAvatar = multer({
    storage: makeStorage('avatars'),
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
}).single('avatar');

// ── Middleware wrappers (convert multer callback to express middleware) ────────
export const handleThumbnailUpload = (req, res, next) => {
    uploadThumbnail(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
};

export const handleVideoUpload = (req, res, next) => {
    uploadVideo(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
};

export const handlePDFUpload = (req, res, next) => {
    uploadPDF(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
};

export const handleResourceUpload = (req, res, next) => {
    uploadResource(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }
        next();
    });
};

// ── Helper to delete a file from disk ─────────────────────────────────────────
export const deleteUploadedFile = (filePath) => {
    if (!filePath) return;
    // Only delete if the path is within our uploads directory
    const absolutePath = filePath.startsWith('/uploads')
        ? path.join(__dirname, '..', filePath)
        : filePath;
    if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
    }
};
