// File: /api/create-checkout-session.ts
import Stripe from 'stripe';

// This will be configured in Vercel in the next step
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { flyer } = await req.json();

    if (!flyer || !flyer.id) {
      return new Response(JSON.stringify({ error: 'Missing flyer data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
       });
    }

    const appUrl = req.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
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

  } catch (err: any) {
    console.error('Stripe Error:', err.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }
}
