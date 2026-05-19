import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { generateCertificate, downloadCertificate, previewCertificate, getCertificateInfo } from '../controllers/certificatesController.js';

const router = Router();

console.log("🔥 NEW CERTIFICATE ROUTES ACTIVE");

// POST /api/certificates/generate - Generate and download certificate PDF
router.post('/generate', authenticate, generateCertificate);

// GET /api/certificates/download/:id - Download certificate PDF
router.get('/download/:id', authenticate, downloadCertificate);

// GET /api/certificates/preview/:id - Preview certificate PDF in browser
router.get('/preview/:id', previewCertificate);

// GET /api/certificates/:id - Get certificate info
router.get('/:id', getCertificateInfo);

export default router;
