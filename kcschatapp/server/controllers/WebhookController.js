import { Webhook } from 'svix';
import User from '../model/UserModel.js'; // Adjust path as needed

export const handleClerkWebhook = async (req, res) => {
  // Check if the 'Svix-Id', 'Svix-Timestamp', and 'Svix-Signature' headers are present
  const svix_id = req.headers['svix-id'];
  const svix_timestamp = req.headers['svix-timestamp'];
  const svix_signature = req.headers['svix-signature'];

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).send('Error occured -- no svix headers');
  }

  const payload = JSON.stringify(req.body);
  const whsec = process.env.CLERK_WEBHOOK_SIGNING_SECRET; // Must be set in .env

  if (!whsec) {
    console.error('Clerk webhook signing secret is not set in environment variables.');
    return res.status(500).send('Webhook secret not configured');
  }

  const wh = new Webhook(whsec);
  let evt;

  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Error verifying webhook:', err.message);
    return res.status(400).send('Error occured');
  }

  const { id: clerkUserId, ...attributes } = evt.data; // evt.data contains the user object from Clerk
  const eventType = evt.type;

  console.log(`Received webhook event: ${eventType} for Clerk User ID: ${clerkUserId}`);

  try {
    switch (eventType) {
      case 'user.created':
        // Ensure email_addresses is present and has at least one entry
        const primaryEmailCreated = attributes.email_addresses?.find(e => e.id === attributes.primary_email_address_id)?.email_address;
        if (!primaryEmailCreated) {
             console.error('Primary email not found for user.created event for Clerk User ID:', clerkUserId, attributes);
             return res.status(400).json({ success: false, message: 'Primary email not found.' });
        }

        await User.create({
          clerkUserId: clerkUserId,
          email: primaryEmailCreated,
          firstName: attributes.first_name,
          lastName: attributes.last_name,
          image: attributes.image_url,
          // Set other fields from 'attributes' as needed, ensure they exist in your UserModel
          // profileSetup: false, // Default from UserModel if not overridden
          // color: null, // Default from UserModel if not overridden
        });
        console.log(`User ${clerkUserId} created in local DB.`);
        break;

      case 'user.updated':
        const primaryEmailUpdated = attributes.email_addresses?.find(e => e.id === attributes.primary_email_address_id)?.email_address;
         if (!primaryEmailUpdated) {
             console.error('Primary email not found for user.updated event for Clerk User ID:', clerkUserId, attributes);
             return res.status(400).json({ success: false, message: 'Primary email not found for update.' });
         }
        const updatedUser = await User.findOneAndUpdate(
          { clerkUserId: clerkUserId },
          {
            email: primaryEmailUpdated,
            firstName: attributes.first_name,
            lastName: attributes.last_name,
            image: attributes.image_url,
            // Update other fields from 'attributes'
          },
          { new: true, runValidators: true } // Return the updated document, run schema validators
        );
        if (updatedUser) {
         console.log(`User ${clerkUserId} updated in local DB.`);
        } else {
         // This could happen if user.created webhook was missed. Create the user.
         console.warn(`User ${clerkUserId} not found for update via webhook. Creating user instead.`);
          await User.create({
             clerkUserId: clerkUserId,
             email: primaryEmailUpdated,
             firstName: attributes.first_name,
             lastName: attributes.last_name,
             image: attributes.image_url,
         });
         console.log(`User ${clerkUserId} was not found during update, so created in local DB.`);
        }
        break;

      case 'user.deleted':
        // Clerk user might be soft-deleted (allow re-activation) or hard-deleted.
        // attributes.deleted will be true for hard deletion.
        // For this example, we'll hard delete from local DB.
        const deletedUser = await User.findOneAndDelete({ clerkUserId: clerkUserId });
        if (deletedUser) {
         console.log(`User ${clerkUserId} deleted from local DB.`);
        } else {
         console.warn(`User ${clerkUserId} not found for deletion via webhook.`);
        }
        break;

      default:
        console.log(`Unhandled webhook event type: ${eventType} for Clerk User ID: ${clerkUserId}`);
    }
    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error(`Error processing webhook event ${eventType} for Clerk User ID ${clerkUserId}:`, error);
    // It's important to respond with a 2xx status even if processing fails internally for some events
    // unless it's an issue with the webhook itself (like verification).
    // Clerk/Svix might retry if they get a non-2xx.
    // For critical processing errors, you might still return 500, but log carefully.
    // Let's return 200 but indicate failure in payload for internal errors to avoid Svix retries for now.
    res.status(200).json({ success: false, message: `Internal server error processing webhook: ${error.message}` });
  }
};
