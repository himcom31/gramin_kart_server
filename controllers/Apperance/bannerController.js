const Banner = require('../../models/Apperance/Banner');

// 1. Add New Banner
exports.addBanner = async (req, res) => {
    try {
        const { title, isOwnShop } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Banner image is required" });
        }

        const banner = await Banner.create({
            title,
            isOwnShop: isOwnShop === 'true' || isOwnShop === true,
            bannerImage: req.file.path
        });

        res.status(201).json({ success: true, data: banner });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 2. Get All Banners
exports.getBanners = async (req, res) => {
    try {
        const banners = await Banner.find();
        res.status(200).json({ success: true, data: banners });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 3. Delete Banner
exports.deleteBanner = async (req, res) => {
    try {
        await Banner.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Banner deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};