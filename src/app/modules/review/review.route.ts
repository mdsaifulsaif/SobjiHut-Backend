import { Router } from 'express';
import { ReviewControllers } from './review.controller';
import { isAuthenticated } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/add-review', isAuthenticated, ReviewControllers.createReview);
router.get('/', ReviewControllers.getReviews);
router.get("/:id", ReviewControllers.getProductReviews);

export const ReviewRoutes = router;