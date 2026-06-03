import express from 'express';
import { handleContactForm } from './email.controller';


const router = express.Router();


router.post('/send-email', handleContactForm);

export const ContactRoutes = router;