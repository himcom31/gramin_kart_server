const Customer = require('../models/Customer');

// @desc Add New Customer (Admin Side)
exports.addCustomer = async (req, res) => {
    try {
        const { fullName, email, phone, street, city, pincode, totalSpent, totalOrders } = req.body;
        const avatarUrl = req.file ? req.file.path : null;

        // Duplicate check — mirrors { $or: [{ email }, { phone }] }
        const existingCustomer = await Customer.findOne({ $or: [{ email }, { phone }] });
        if (existingCustomer) {
            return res.status(400).json({
                success: false,
                message: "Customer already exists with this email or phone."
            });
        }

        const customer = await Customer.create({
            fullName,
            email,
            phone,
            avatar:      avatarUrl,
            totalOrders: totalOrders || 0,
            totalSpent:  totalSpent  || 0,
            isActive:    true,
            address: (street || city || pincode) ? [{
                street,
                city,
                pincode,
                isDefault: true
            }] : []
        });

        res.status(201).json({
            success: true,
            message: "Customer Created with Image and Stats!",
            customer
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: "Customer already exists with this email or phone."
            });
        }
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Get All Customers
exports.getAllCustomers = async (req, res) => {
    try {
        const customers      = await Customer.find();
        const totalCustomers = await Customer.countDocuments();
        const activeCustomers = await Customer.countDocuments({ isActive: true });

        res.status(200).json({
            success: true,
            total:   totalCustomers,
            active:  activeCustomers,
            customers
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Update Customer Details
exports.updateCustomer = async (req, res) => {
    try {
        const { fullName, email, phone, street, city, pincode, isActive } = req.body;
        const customerId = req.params.id;

        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer nahi mila" });
        }

        const avatarUrl = req.file ? req.file.path : customer.avatar;

        // Rebuild default address if any address field provided
        let updatedAddress = undefined;  // undefined = don't touch addresses
        if (street || city || pincode) {
            const existing = customer.address?.[0] ?? {};
            updatedAddress = [{
                street:    street    || existing.street,
                city:      city      || existing.city,
                pincode:   pincode   || existing.pincode,
                isDefault: true
            }];
        }

        const updatedCustomer = await Customer.findByIdAndUpdate(customerId, {
            fullName: fullName || customer.fullName,
            email:    email    || customer.email,
            phone:    phone    || customer.phone,
            avatar:   avatarUrl,
            isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : customer.isActive,
            address:  updatedAddress
        });

        res.status(200).json({
            success: true,
            message: "Customer profile updated!",
            customer: updatedCustomer
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Delete Customer
exports.deleteCustomer = async (req, res) => {
    try {
        const customer = await Customer.findByIdAndDelete(req.params.id);

        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer nahi mila!" });
        }

        res.status(200).json({
            success: true,
            message: `Customer '${customer.fullName}' ko successfully delete kar diya gaya hai.`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Delete karne mein error aayi",
            error: error.message
        });
    }
};