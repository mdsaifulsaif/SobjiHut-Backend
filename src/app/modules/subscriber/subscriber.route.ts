import { Router } from 'express';
import { SubscriberControllers } from './subscriber.controller';

const router = Router();

router.post('/add', SubscriberControllers.subscribeEmail);
router.get('/', SubscriberControllers.getSubscribers);

export const SubscriberRoutes = router;