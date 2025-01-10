// routes.js
import { Router } from 'express';
import * as controller from './controller.js';
import { validateAddress, asyncHandler } from './middleware.js';

const router = Router();

// Pool data endpoints
router.get('/pool/:poolAddress', validateAddress, asyncHandler(controller.getPoolInfo));
router.get('/pool/:poolAddress/info', validateAddress, asyncHandler(controller.getEnhancedPoolInfo));
router.get('/pool/:poolAddress/ticks', validateAddress, asyncHandler(controller.getPoolTicks));
router.get('/pool/:poolAddress/analytics', validateAddress, asyncHandler(controller.getPoolAnalytics));
router.get('/pool/:poolAddress/metrics', validateAddress, asyncHandler(controller.getPoolMetrics));
router.get('/pool/:poolAddress/range', validateAddress, asyncHandler(controller.getPoolRange));

// Search endpoint
router.get('/search', controller.searchPools);

// Top pools endpoint
router.get('/pools/top', controller.getTopPools);

export default router;