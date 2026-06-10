const Currency = require('../models/Currency');

// @desc Add New Currency
exports.addCurrency = async (req, res) => {
    try {
        const { currencyName, currencySymbol, currencyCode, exchangeRate, isDefault } = req.body;

        const isDefaultBool = isDefault === true || isDefault === 'true';

        // If this is default, clear all existing defaults first
        if (isDefaultBool) {
            await Currency.clearDefault();
        }

        const newCurrency = await Currency.create({
            currencyName,
            currencySymbol,
            currencyCode,
            exchangeRate,
            isDefault: isDefaultBool
        });

        res.status(201).json({
            success: true,
            message: "Currency added successfully!",
            data: newCurrency
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                error: "A currency with this name already exists."
            });
        }
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc Get All Currencies
exports.getAllCurrencies = async (req, res) => {
    try {
        const currencies = await Currency.find();  // default first, then by createdAt
        res.status(200).json({ success: true, currencies });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};