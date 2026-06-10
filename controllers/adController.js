const Ad = require('../models/Ad');

exports.addAd = async (req, res) => {
    try {
        const { title, link, position, isActive } = req.body;
        const image = req.file ? req.file.path : null;

        if (!image) {
            return res.status(400).json({ success: false, message: "Ad Image is required" });
        }

        const newAd = await Ad.create({
            title,
            image,
            link,
            position,
            isActive: isActive === 'true' || isActive === true
        });

        res.status(201).json({
            success: true,
            message: "Advertisement added successfully!",
            ad: newAd
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getAllAds = async (req, res) => {
    try {
        const ads = await Ad.find();   // sorted DESC by createdAt in model
        res.status(200).json({ success: true, ads });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getActiveAds = async (req, res) => {
    try {
        const ads = await Ad.find({ isActive: true });
        res.status(200).json({ success: true, ads });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getAdById = async (req, res) => {
    try {
        const ad = await Ad.findById(req.params.id);
        if (!ad) {
            return res.status(404).json({ success: false, message: "Ad not found" });
        }
        res.status(200).json({ success: true, ad });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateAd = async (req, res) => {
    try {
        const ad = await Ad.findById(req.params.id);
        if (!ad) {
            return res.status(404).json({ success: false, message: "Ad not found" });
        }

        const { title, link, position, isActive } = req.body;
        const updateData = {};

        if (title    !== undefined) updateData.title    = title;
        if (link     !== undefined) updateData.link     = link;
        if (position !== undefined) updateData.position = position;
        if (isActive !== undefined) updateData.isActive = isActive === 'true' || isActive === true;
        if (req.file)               updateData.image    = req.file.path;

        const updated = await Ad.findByIdAndUpdate(req.params.id, updateData);

        res.status(200).json({
            success: true,
            message: "Advertisement updated successfully!",
            ad: updated
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.toggleAdStatus = async (req, res) => {
    try {
        const ad = await Ad.toggleStatus(req.params.id);
        if (!ad) {
            return res.status(404).json({ success: false, message: "Ad not found" });
        }

        res.status(200).json({
            success: true,
            message: `Ad ${ad.isActive ? 'activated' : 'deactivated'} successfully!`,
            ad
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteAd = async (req, res) => {
    try {
        const ad = await Ad.findByIdAndDelete(req.params.id);
        if (!ad) {
            return res.status(404).json({ success: false, message: "Ad not found" });
        }

        res.status(200).json({
            success: true,
            message: "Advertisement deleted successfully!"
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};