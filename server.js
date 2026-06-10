const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db.js');

require('dotenv').config();

const app = express();

// Connect DB
connectDB();

// Middleware
app.use(cors());
//app.use(express.json());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use('/api/auth', require('./routes/authRoutes.js'));
app.use('/api/products', require('./routes/productRoutes.js'));
app.use('/api/Category', require('./routes/categoryRoutes.js'));
app.use('/api/flash',require('./routes/flashSaleRoutes.js'))
app.use('/api/ad',require('./routes/adRoutes.js'))
app.use('/api/coupon',require('./routes/couponRoutes.js'))
// app.use('/api/notifications',require('./routes/notificationRoutes.js'))
app.use('/api/blog',require('./routes/blogRoutes.js'))
app.use('/api/driver',require('./routes/driverRoutes.js'))
app.use('/api/customers',require('./routes/customerRoutes.js'))
app.use('/api/business',require('./routes/businessRoutes.js'))
app.use('/api/taxes',require('./routes/taxRoutes.js'))
app.use('/api/delivery',require('./routes/deliveryRoutes.js'))
app.use('/api/currencies',require('./routes/currencyRoutes.js'))
app.use('/api/payment',require('./routes/paymentSettingRoutes.js'))
app.use('/api/sms-settings',require('./routes/smsRoutes.js'))
app.use('/api/google',require('./routes/googleAuthRoutes.js'))
app.use('/api/pusher',require('./routes/pusherRoutes.js'))
app.use('/api/mail',require('./routes/mailRoutes.js'))
app.use('/api/firebase',require('./routes/Firebaseroutes.js'))
app.use('/api/user',require('./routes/User/User.js'))
app.use('/api/wishlist',require('./routes/User/wishlistRoutes.js'))
app.use('/api/cart',require('./routes/User/cartRoutes.js'))
app.use('/api/address',require('./routes/User/Addressroutes.js'))
app.use('/api/ticket',require('./routes/ticketIssueType.js'))
app.use('/api/support',require('./routes/Supportticket.js'))
app.use('/api/orders',require('./routes/Orderroutes.js'))
app.use('/api/invoice',require('./routes/Invoiceroute.js'))
app.use('/api/receipt',require('./routes/Receiptroute.js'))
app.use('/api/banner',require('./routes/bannerRoutes.js'))































const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));