const { pool } = require('../db');

async function handleStripeWebhook(req, res) {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !process.env.STRIPE_SECRET_KEY) {
    console.log('[Webhook] Stripe not configured, skipping');
    return res.status(200).send('OK');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        const email = session.customer_email || session.customer_details?.email;

        if (email) {
          // Determine plan from the subscription
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = sub.items.data[0]?.price?.id;
          let plan = 'pro';
          if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
            plan = 'business';
          }

          await pool.query(
            `UPDATE users SET plan = $1, stripe_customer_id = $2, stripe_subscription_id = $3
             WHERE email = $4`,
            [plan, customerId, subscriptionId, email.toLowerCase()]
          );
          console.log(`[Webhook] Upgraded ${email} to ${plan}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        if (sub.status === 'active') {
          const priceId = sub.items.data[0]?.price?.id;
          let plan = 'pro';
          if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) {
            plan = 'business';
          }
          await pool.query(
            'UPDATE users SET plan = $1 WHERE stripe_subscription_id = $2',
            [plan, sub.id]
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await pool.query(
          `UPDATE users SET plan = 'free', stripe_subscription_id = NULL
           WHERE stripe_subscription_id = $1`,
          [sub.id]
        );
        console.log(`[Webhook] Subscription ${sub.id} cancelled, downgraded to free`);
        break;
      }

      default:
        break;
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[Webhook] Processing error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

module.exports = handleStripeWebhook;
