import Stripe from 'stripe';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

// Use a mock stripe key if environment variable isn't set
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key');

// @desc    Create Stripe Checkout Session for Wallet/Subscription
// @route   POST /api/v1/payments/create-checkout-session
// @access  Private
export const createCheckoutSession = async (req, res, next) => {
    try {
        const { type, amount, plan } = req.body;
        
        let line_items = [];
        let metadata = {
            userId: req.user.id,
            type: type // 'wallet' or 'subscription'
        };

        if (type === 'wallet') {
            line_items = [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: 'Wallet Top-up' },
                    unit_amount: amount * 100, // Stripe expects cents
                },
                quantity: 1,
            }];
            metadata.amount = amount;
        } else if (type === 'subscription') {
            const prices = {
                'Silver': 999, // $9.99
                'Ruby': 1999, // $19.99
                'Platinum': 2999 // $29.99
            };
            line_items = [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: `${plan} Subscription` },
                    unit_amount: prices[plan],
                },
                quantity: 1,
            }];
            metadata.plan = plan;
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/cancel`,
            metadata
        });

        res.status(200).json({ id: session.id, url: session.url });
    } catch (error) {
        next(error);
    }
};

// @desc    Stripe Webhook (Handle successful payments)
// @route   POST /api/v1/payments/webhook
// @access  Public
export const webhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock');
    } catch (err) {
        // Since we are mocking Stripe locally without keys, we'll gracefully mock the webhook too
        console.log(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { userId, type, amount, plan } = session.metadata;

        const user = await User.findById(userId);

        if (type === 'wallet') {
            user.walletBalance += Number(amount);
            await user.save();
            await Transaction.create({
                user: userId,
                type: 'credit',
                amount: Number(amount),
                description: 'Stripe Wallet Top-up',
                status: 'completed'
            });
        } else if (type === 'subscription') {
            user.subscription = {
                plan: plan,
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 days
            };
            await user.save();
            await Transaction.create({
                user: userId,
                type: 'debit',
                amount: session.amount_total ? session.amount_total / 100 : 0,
                description: `${plan} Subscription Purchase`,
                status: 'completed'
            });
        }
    }

    res.json({ received: true });
};
