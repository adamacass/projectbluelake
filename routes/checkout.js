const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/create-checkout', requireAuth, async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    req.session.flash = { type: 'error', message: 'Stripe is not configured yet.' };
    return res.redirect('/pricing');
  }

  const stripe = require('stripe')(stripeKey);
  const { plan } = req.body;

  const priceId = plan === 'business'
    ? process.env.STRIPE_BUSINESS_PRICE_ID
    : process.env.STRIPE_PRO_PRICE_ID;

  if (!priceId) {
    req.session.flash = { type: 'error', message: 'Price not configured. Check your Stripe setup.' };
    return res.redirect('/pricing');
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: res.locals.user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${res.locals.appUrl}/dashboard?upgraded=true`,
      cancel_url: `${res.locals.appUrl}/pricing`,
      metadata: {
        userId: String(res.locals.user.id),
      },
    });

    res.redirect(303, session.url);
  } catch (err) {
    console.error('[Checkout] Error:', err.message);
    req.session.flash = { type: 'error', message: 'Failed to create checkout session.' };
    res.redirect('/pricing');
  }
});

module.exports = router;
