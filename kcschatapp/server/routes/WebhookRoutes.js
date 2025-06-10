import { Router } from 'express';
import { handleClerkWebhook } from '../controllers/WebhookController.js';
import express from 'express';

const router = Router();

// Use express.raw({type: 'application/json'}) to get the body as a buffer for svix verification
// This is crucial for the Svix library to verify the signature correctly.
router.post('/clerk', express.raw({type: 'application/json'}), handleClerkWebhook);

export default router;
