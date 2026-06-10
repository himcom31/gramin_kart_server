const express         = require('express');
const router          = express.Router();
const { protectUser } = require('../../middleware/authMiddleware');
const User            = require('../../models/User/User');

const cleanBody = ({ name, phone, altPhone, pincode, state, city, house, road, landmark, type, isDefault }) => ({
    name:      (name      || '').trim(),
    phone:     (phone     || '').trim(),
    altPhone:  (altPhone  || '').trim(),
    pincode:   (pincode   || '').trim(),
    state:     (state     || '').trim(),
    city:      (city      || '').trim(),
    house:     (house     || '').trim(),
    road:      (road      || '').trim(),
    landmark:  (landmark  || '').trim(),
    type:      type      || 'Home',
    isDefault: Boolean(isDefault),
});

const validateAddress = ({ name, phone, pincode, state, city, house, road }) => {
    if (!name)    return 'Name is required';
    if (!phone)   return 'Phone number is required';
    if (!pincode) return 'Pincode is required';
    if (!state)   return 'State is required';
    if (!city)    return 'City is required';
    if (!house)   return 'House / Building is required';
    if (!road)    return 'Road / Area is required';
    return null;
};

router.get('/', protectUser, async (req, res) => {
    try {
        const addresses = await User.getAddresses(req.user.id);
        res.json({ success: true, addresses });
    } catch (err) {
        console.error('[GET /api/address]', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/', protectUser, async (req, res) => {
    try {
        const data  = cleanBody(req.body);
        const error = validateAddress(data);
        if (error) return res.status(400).json({ success: false, message: error });

        const addresses = await User.addAddress(req.user.id, data);
        res.status(201).json({ success: true, message: 'Address added successfully', addresses });
    } catch (err) {
        console.error('[POST /api/address]', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.put('/:id', protectUser, async (req, res) => {
    try {
        const data  = cleanBody(req.body);
        const error = validateAddress(data);
        if (error) return res.status(400).json({ success: false, message: error });

        const addresses = await User.updateAddress(req.user.id, req.params.id, data);
        if (!addresses) return res.status(404).json({ success: false, message: 'Address not found' });

        res.json({ success: true, message: 'Address updated successfully', addresses });
    } catch (err) {
        console.error('[PUT /api/address/:id]', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.delete('/:id', protectUser, async (req, res) => {
    try {
        const addresses = await User.deleteAddress(req.user.id, req.params.id);
        if (!addresses) return res.status(404).json({ success: false, message: 'Address not found' });

        res.json({ success: true, message: 'Address removed successfully', addresses });
    } catch (err) {
        console.error('[DELETE /api/address/:id]', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.patch('/:id/set-default', protectUser, async (req, res) => {
    try {
        const addresses = await User.setDefaultAddress(req.user.id, req.params.id);
        if (!addresses) return res.status(404).json({ success: false, message: 'Address not found' });

        res.json({ success: true, message: 'Default address updated', addresses });
    } catch (err) {
        console.error('[PATCH /api/address/:id/set-default]', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;