import Stripe from 'stripe';

// This file is a secure backend proxy. It runs on the server, not in the browser.
// It safely uses your STRIPE_SECRET_KEY environment variable.

let stripe: Stripe;

function getStripe() {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY environment variable not set on the server.");
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { flyer } = await req.json();

    if (!flyer || !flyer.id || !flyer.headline) {
      return new Response(JSON.stringify({ error: 'Missing flyer data for checkout.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const appUrl = req.headers.get('origin') || 'http://localhost:3000';
    const stripeClient = getStripe();

    const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Watermark-Free Flyer Download',
                        description: `Your custom design: "${flyer.headline}"`,
                    },
                    unit_amount: 199, // Price in cents ($1.99)
                },
                quantity: 1,
            },
        ],
        mode: 'payment',
        success_url: `${appUrl}?payment_success=true&flyer_id=${flyer.id}`,
        cancel_url: appUrl,
    });

    return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in Stripe proxy:', error);
    return new Response(JSON.stringify({ 
        error: 'An error occurred while creating the payment session.',
        details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}