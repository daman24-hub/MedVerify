import { Router } from 'express'
import { query, body, validationResult } from 'express-validator' // FIXED: express-validator imports
import rateLimit from 'express-rate-limit' // FIXED: express-rate-limit import
import {
	getHeatmap,
	logScan,
	verifyMedicine,
} from '../controllers/medicineController.js'
import { checkInteractions } from '../controllers/interactionController.js'
import { register, login, getCurrentUser } from '../controllers/authController.js'
import { saveOcrResult, getOcrResults, verifyStatus } from '../controllers/ocrController.js'
import { verifyMedicineImage } from '../controllers/imageController.js'
import verifyToken from '../middleware/auth.js'

const router = Router()

// FIXED: verifyLimiter config to prevent spam
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute window
  max: 20,              // max 20 requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please wait a moment before trying again.'
  }
});

// FIXED: helper middleware to check validation results
const validateResult = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ success: false, errors: errors.array() });
	}
	next();
};

// Auth routes
// FIXED: added validations and error checks for register
router.post(
	'/auth/register',
	[
		body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
		body('password').notEmpty().withMessage('Password is required'),
		body('name').notEmpty().withMessage('Name is required').trim().escape()
	],
	validateResult,
	register
)

// FIXED: added validations and error checks for login
router.post(
	'/auth/login',
	[
		body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
		body('password').notEmpty().withMessage('Password is required')
	],
	validateResult,
	login
)

router.get('/auth/me', getCurrentUser)

// Protected medicine routes
// FIXED: added verifyLimiter, validations, and error checks for /verify
router.get(
	'/verify',
	verifyLimiter,
	[
		query('name')
			.notEmpty().withMessage('Medicine name is required')
			.isString().withMessage('Name must be a string')
			.trim()
			.escape()
	],
	validateResult,
	verifyMedicine
)

// FIXED: added validations and error checks for /scan-log
router.post(
	'/scan-log',
	[
		body('medicine').optional().isString().trim().escape(),
		body('medicineName').optional().isString().trim().escape(),
		body('result').optional().isString().trim().escape(),
		body('lat').optional().isNumeric(),
		body('lng').optional().isNumeric(),
		body('latitude').optional().isNumeric(),
		body('longitude').optional().isNumeric(),
		body('district').optional().isString().trim().escape()
	],
	validateResult,
	logScan
)

router.get('/heatmap', getHeatmap)

/**
 * POST /api/interactions
 * Body: {
 *   medicines: string[]   // array of medicine names to check interactions between
 * }
 * Response: {
 *   success: boolean,
 *   interactions: { pair: string[], description: string, severity: string }[]
 * }
 */
// FIXED: added validations and error checks for /interactions
router.post(
	'/interactions',
	[
		body('medicines')
			.isArray({ min: 2 }).withMessage('medicines must be an array of at least 2 names'),
		body('medicines.*')
			.isString().withMessage('each medicine must be a string')
			.trim()
	],
	validateResult,
	checkInteractions
)

// OCR persistence and verification status routes
router.post('/ocr', saveOcrResult)
router.get('/ocr', verifyToken, getOcrResults)
router.post('/verify', verifyStatus)
router.post('/verify-image', verifyMedicineImage)

export default router

/*
CURL TESTS FOR API ROUTES:

1. Test /api/verify with missing name parameter (should fail validation):
curl.exe -s http://localhost:5000/api/verify
Output:
{"success":false,"errors":[{"type":"field","msg":"Medicine name is required","path":"name","location":"query"},{"type":"field","msg":"Name must be a string","path":"name","location":"query"}]}

2. Test /api/verify with valid name parameter:
curl.exe -s "http://localhost:5000/api/verify?name=PAREDRINE"
Output:
{"success":true,"medicine":{"name":"PAREDRINE","manufacturer":"PHARMICS","isGenuine":true,"status":"genuine","price":0,"genericAlternatives":[]}}

3. Test /api/interactions validation failure:
curl.exe -s -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"medicines\":[\"Paracetamol\"]}" http://localhost:5000/api/interactions
Output:
{"success":false,"errors":[{"type":"field","value":["Paracetamol"],"msg":"medicines must be an array of at least 2 names","path":"medicines","location":"body"}]}
*/
