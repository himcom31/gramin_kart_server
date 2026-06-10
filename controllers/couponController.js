const Coupon = require('../models/Coupon');

// @desc Add New Promo Code
exports.addCoupon = async (req, res) => {
    try {
        const data = { ...req.body };
        data.couponCode = data.couponCode.toUpperCase();

        // Convert category → category_id
        if (data.category) {
            data.category_id = Number(data.category);
            delete data.category;
        }

        // Clear category_id if not Category_Specific
        if (data.applicableFor && data.applicableFor !== 'Category_Specific') {
            data.category_id = null;
        }

        const coupon = await Coupon.create(data);
        res.status(201).json({ success: true, message: "Promo Code Created!", coupon });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, error: "Coupon code already exists." });
        }
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Get All Coupons
exports.getCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find();   // sorted DESC + category joined in model
        res.status(200).json({ success: true, coupons });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Update a Coupon
exports.updateCoupon = async (req, res) => {
    try {
        const updateData = { ...req.body };

        if (updateData.couponCode) {
            updateData.couponCode = updateData.couponCode.toUpperCase();
        }

        // Convert category → category_id
        if (updateData.category !== undefined) {
            updateData.category_id = updateData.category ? Number(updateData.category) : null;
            delete updateData.category;
        }

        // Clear category_id if not Category_Specific
        if (updateData.applicableFor && updateData.applicableFor !== 'Category_Specific') {
            updateData.category_id = null;
        }

        const coupon = await Coupon.findByIdAndUpdate(req.params.id, updateData);

        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        res.status(200).json({ success: true, message: "Promo Code Updated!", coupon });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, error: "Coupon code already exists." });
        }
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Delete a Coupon
exports.deleteCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndDelete(req.params.id);

        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        res.status(200).json({ success: true, message: "Promo Code Deleted!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Toggle Coupon Active Status
exports.toggleCouponStatus = async (req, res) => {
    try {
        const coupon = await Coupon.toggleStatus(req.params.id);

        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        res.status(200).json({
            success: true,
            message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'}!`,
            coupon
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Validate Coupon (at checkout)
exports.validateCoupon = async (req, res) => {
    try {
        const { code, orderAmount } = req.body;

        const coupon = await Coupon.findOne({
            couponCode: code.toUpperCase(),
            isActive:   true
        });

        if (!coupon) {
            return res.status(404).json({ message: "Invalid Coupon Code" });
        }

        // Expiry check
        const now        = new Date();
        const expiryDate = new Date(coupon.expiryDate);
        if (now > expiryDate) {
            return res.status(400).json({ message: "Coupon Expired" });
        }

        // Min order check
        if (orderAmount < coupon.minOrderAmount) {
            return res.status(400).json({
                message: `Min order should be ₹${coupon.minOrderAmount}`
            });
        }

        res.status(200).json({ success: true, coupon });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};