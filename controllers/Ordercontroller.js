const Order = require('../models/Order');
const Cart = require('../models/User/Cart');
const User = require('../models/User/User');
const Product = require('../models/product_Management/Product');
const sendSms = require('../utils/sendSms');
const { orderPlacedEmail, orderStatusEmail, riderAssignedEmail, driverAssignedEmail } = require('../utils/emailTemplates');
const sendNotification = require('../utils/sendNotification');
const fireAndForget = require('../utils/fireAndForget');


// ─── Snapshot Address ─────────────────────────────────────────────────────────
const snapshotAddress = (addr) => ({
    name: addr.name || '',
    phone: addr.phone || '',
    altPhone: addr.altPhone || '',
    house: addr.house || '',
    road: addr.road || '',
    city: addr.city || '',
    state: addr.state || '',
    pincode: addr.pincode || '',
    landmark: addr.landmark || '',
    type: addr.type || 'Home',
});


// ─── Place Order ──────────────────────────────────────────────────────────────
exports.placeOrder = async (req, res) => {
    try {
        const {
            addressId,
            paymentMethod = 'COD',
            note = '',
            couponCode = null,
            couponDiscount = 0,
            shippingCharge = 0,
            tax = 0,
            razorpayOrderId = null,
            razorpayPaymentId = null,
        } = req.body;

        // ── 1. Fetch user + addresses ─────────────────────────────────────
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const addresses = user.address ?? [];
        const address = addressId
            ? addresses.find(a => a.id == addressId)
            : addresses.find(a => a.isDefault) || addresses[0];

        if (!address) {
            return res.status(400).json({
                success: false,
                message: 'No delivery address found. Please add one.',
            });
        }

        // ── 2. Fetch cart ─────────────────────────────────────────────────
        const cart = await Cart.findByUser(req.user.id);
        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Your cart is empty' });
        }

        // ── 3. Build order items ──────────────────────────────────────────
        const orderItems = cart.items.map(item => {
            const p = item.product;
            const price = p.sellingPrice ?? p.price ?? 0;
            const qty = item.quantity || 1;
            return {
                product: p.id,
                name: p.name,
                image: p.thumbnail || p.image || null,
                price,
                quantity: qty,
                total: price * qty,
            };
        });

        // ── 4. Pricing ────────────────────────────────────────────────────
        const subtotal = orderItems.reduce((sum, i) => sum + i.total, 0);
        const discount = Number(couponDiscount) || 0;
        const total = Math.max(0, subtotal - discount + Number(shippingCharge) + Number(tax));

        // ── 5. Create order ───────────────────────────────────────────────
        const paymentStatus = (paymentMethod === 'Razorpay' && razorpayPaymentId) ? 'Paid' : 'Pending';

        const order = await Order.create({
            user: req.user.id,
            items: orderItems,
            subtotal,
            discount,
            shippingCharge: Number(shippingCharge),
            tax: Number(tax),
            total,
            couponCode: couponCode || null,
            couponDiscount: discount,
            shippingAddress: snapshotAddress(address),
            paymentMethod,
            paymentStatus,
            razorpayOrderId,
            razorpayPaymentId,
            note,
        });

        // ── 6. Clear cart ─────────────────────────────────────────────────
        await Cart.clearByUser(req.user.id);

        // ── 7. Respond immediately ────────────────────────────────────────
        res.status(201).json({ success: true, message: 'Order placed successfully!', order });

        // ── 8. Background: notifications + SMS ───────────────────────────
        fireAndForget(async () => {
            // Email + push notification
            const { subject, html } = orderPlacedEmail(user.fullName, order.id, total, paymentMethod);
            const message = `Hello ${user.name}! Order #${order.id} placed. Total: ₹${total}. – GraminKart`;
            await sendNotification({ phone: user.phone, email: user.email, subject, message, html });

            // SMS to customer
            if (user.phone) {
                const smsMessage =
                    `Hello ${user.name || user.fullName}!\n\n` +
                    `Your order has been placed successfully.\n` +
                    `Order ID  : #${order.id}\n` +
                    `Total     : Rs.${total}\n` +
                    `Payment   : ${paymentMethod}\n\n` +
                    `We will notify you once it's shipped.\n` +
                    `– GraminKart Team`;

                await sendSms(user.phone, smsMessage);
            }
        }, 'place-order-notifications');

    } catch (err) {
        console.error('[POST /api/orders/place]', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};


// ─── Get My Orders ────────────────────────────────────────────────────────────
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user_id: req.user.id });
        res.json({ success: true, orders });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


// ─── Get Single Order (user-scoped) ──────────────────────────────────────────
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findOne({ id: req.params.id, user_id: req.user.id });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


// ─── Cancel Order ─────────────────────────────────────────────────────────────
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findOne({ id: req.params.id, user_id: req.user.id });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        if (!['Pending', 'Processing'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel a ${order.status} order`,
            });
        }

        // ── Fetch user before updating ────────────────────────────────────
        // FIX: user was never fetched in the original code
        const user = await User.findById(order.user_id);

        const updated = await Order.findByIdAndUpdate(req.params.id, {
            status: 'Cancelled',
            cancelledAt: new Date(),
        });

        // ── Respond immediately ───────────────────────────────────────────
        res.json({ success: true, message: 'Order cancelled', order: updated });

        // ── Background: SMS to customer ───────────────────────────────────
        fireAndForget(async () => {
            if (user?.phone) {
                const smsMessage =
                    `Hello ${user.name || user.fullName}!\n\n` +
                    `Your order #${order.id} has been cancelled.\n` +
                    `If you did not request this, please contact support.\n\n` +
                    `– GraminKart Team`;

                await sendSms(user.phone, smsMessage);
            }
        }, 'cancel-order-sms');

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


// ─── Admin: Get All Orders (paginated + filtered) ─────────────────────────────
exports.adminGetAllOrders = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            paymentStatus,
            paymentMethod,
            search,
            dateFrom,
            dateTo,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = req.query;

        const filters = {};
        if (status && status !== 'All') filters.status = status;
        if (paymentStatus && paymentStatus !== 'All') filters.paymentStatus = paymentStatus;
        if (paymentMethod && paymentMethod !== 'All') filters.paymentMethod = paymentMethod;

        if (dateFrom) filters.dateFrom = new Date(dateFrom).toISOString().slice(0, 19).replace('T', ' ');
        if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            filters.dateTo = end.toISOString().slice(0, 19).replace('T', ' ');
        }

        const { orders, total } = await Order.adminFind({
            filters,
            search: search?.trim() || null,
            sortBy,
            sortOrder,
            page: Number(page),
            limit: Number(limit),
        });

        res.json({
            success: true,
            orders,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


// ─── Admin: Update Order Status ───────────────────────────────────────────────
// ─── Admin: Update Order Status ───────────────────────────────────────────────
exports.adminUpdateOrderStatus = async (req, res) => {
    try {
        const { status, paymentStatus } = req.body;

        // Must have at least one field to update
        if (!status && !paymentStatus) {
            return res.status(400).json({ success: false, message: 'Nothing to update' });
        }

        const updateData = {};

        // ── Apply status ──────────────────────────────────────────────────
        if (status) {
            updateData.status = status;

            if (status === 'Delivered') {
                updateData.deliveredAt = new Date();
                updateData.paymentStatus = 'Paid';   // force Paid on delivery
            }

            if (status === 'Cancelled') {
                updateData.cancelledAt = new Date();
            }
        }

        // ── Apply paymentStatus from body ONLY if status != Delivered ─────
        // (Delivered forces Paid above, so don't let body override it back)
        if (paymentStatus && status !== 'Delivered') {
            updateData.paymentStatus = paymentStatus;
        }

        const order = await Order.findByIdAndUpdate(req.params.id, updateData);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // ── Push status history only when status actually changed ─────────
        if (status) {
            await Order.pushStatusHistory(req.params.id, status);
        }

        // ── Re-fetch updated order to return fresh data ───────────────────
        const updatedOrder = await Order.findById(req.params.id);

        res.json({ success: true, order: updatedOrder });

        // ── Background notifications ──────────────────────────────────────
        fireAndForget(async () => {
            if (!status) return;   // no SMS if only paymentStatus changed

            const customer = await User.findById(order.user_id);
            if (!customer) return;

            const { subject, html } = orderStatusEmail(customer.fullName, order.id, status);
            const message = `Hello ${customer.name}! Your order #${order.id} status: ${status}. – GraminKart`;
            await sendNotification({ phone: customer.phone, email: customer.email, subject, message, html });

            if (customer.phone) {
                const statusMessages = {
                    'Processing': `Your order #${order.id} is being prepared.`,
                    'Shipped': `Your order #${order.id} has been shipped!`,
                    'Picked Up': `Your order #${order.id} has been picked up by the driver.`,
                    'In Transit': `Your order #${order.id} is in transit.`,
                    'On The Way': `Your order #${order.id} is almost there!`,
                    'Delivered': `Your order #${order.id} has been delivered. Thank you!`,
                    'Cancelled': `Your order #${order.id} has been cancelled.`,
                };

                const smsMessage =
                    `Hello ${customer.name || customer.fullName}!\n\n` +
                    (statusMessages[status] || `Your order #${order.id} status: ${status}`) +
                    `\n\n– GraminKart Team`;

                await sendSms(customer.phone, smsMessage);
            }
        }, 'order-status-update-notifications');

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── Admin: Assign Rider ──────────────────────────────────────────────────────
exports.adminAssignRider = async (req, res) => {
    try {
        const { driverId } = req.body;
        if (!driverId) {
            return res.status(400).json({ success: false, message: 'driverId is required' });
        }

        const Driver = require('../models/Driver');
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver not found' });
        }

        const order = await Order.findByIdAndUpdate(req.params.id, {
            assignedDriver_id: driverId,
            status: 'Shipped',
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        await Order.pushStatusHistory(
            req.params.id,
            'Shipped',
            `Assigned to driver ${driver.fullName}`
        );

        // ── Respond immediately ───────────────────────────────────────────
        res.json({ success: true, message: 'Rider assigned successfully', order });

        // ── Background: notify driver + customer ──────────────────────────
        // FIX: customer was used before being declared in the original code
        fireAndForget(async () => {
            const customer = await User.findById(order.user_id);

            // ── Notify customer ───────────────────────────────────────────
            if (customer) {
                const { subject: cs, html: ch } = riderAssignedEmail(
                    customer.fullName,
                    order.id,
                    driver.fullName,
                    driver.phone
                );
                await sendNotification({
                    phone: customer.phone,
                    email: customer.email,
                    subject: cs,
                    message: `Driver ${driver.fullName} assigned to your order #${order.id}.`,
                    html: ch,
                });

                if (customer.phone) {
                    const customerSms =
                        `Hello ${customer.name || customer.fullName}!\n\n` +
                        `Great news! Your order #${order.id} has been assigned to a delivery driver.\n` +
                        `Driver : ${driver.fullName}\n` +
                        `Phone  : ${driver.phone}\n\n` +
                        `Your order is on its way!\n` +
                        `– GraminKart Team`;

                    await sendSms(customer.phone, customerSms);
                }
            }

            // ── Notify driver ─────────────────────────────────────────────
            const { subject: ds, html: dh } = driverAssignedEmail(
                driver.fullName,
                order.id,
                order.shippingAddress?.city,
                order.shippingAddress?.pincode,
                order.shippingAddress?.name,
                order.shippingAddress?.phone
            );
            await sendNotification({
                phone: driver.phone,
                email: driver.email,
                subject: ds,
                message: `New order #${order.id} assigned to you. – GraminKart`,
                html: dh,
            });

            if (driver.phone) {
                const driverSms =
                    `Hello ${driver.fullName}!\n\n` +
                    `A new order has been assigned to you.\n` +
                    `Order ID : #${order.id}\n` +
                    `Address  : ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.pincode || ''}\n` +
                    `Customer : ${order.shippingAddress?.name || ''}\n` +
                    `Phone    : ${order.shippingAddress?.phone || ''}\n\n` +
                    `Please pick it up as soon as possible.\n` +
                    `– GraminKart Team`;

                await sendSms(driver.phone, driverSms);
            }
        }, 'assign-rider-notifications');

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};