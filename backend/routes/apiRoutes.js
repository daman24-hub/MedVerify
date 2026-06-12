import { Router } from 'express'
import {
	getHeatmap,
	logScan,
	verifyMedicine,
} from '../controllers/medicineController.js'
import { checkInteractions } from '../controllers/interactionController.js'

const router = Router()

router.get('/verify', verifyMedicine)
router.post('/scan-log', logScan)
router.get('/heatmap', getHeatmap)
router.post('/interactions', checkInteractions)

export default router
