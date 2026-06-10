const Brand     = require('../../models/product_Management/Brand');
const cloudinary = require('cloudinary').v2;

exports.addBrand = async (req, res) => {
    try {
        const { name, description, isActive } = req.body;
        const logo = req.file ? req.file.path : null;

        if (!logo) {
            return res.status(400).json({ success: false, message: "Brand logo is required" });
        }

        const brand = await Brand.create({
            name,
            logo,
            description,
            isActive: isActive === 'true' || isActive === true
        });

        res.status(201).json({ success: true, message: "Brand created successfully!", brand });
    } catch (error) {
        // MySQL duplicate entry error
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: "Brand with this name already exists." });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getBrands = async (req, res) => {
    try {
        const brands = await Brand.find(); // already sorted A→Z in model
        res.status(200).json({ success: true, brands });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateBrand = async (req, res) => {
    try {
        const { id }                    = req.params;
        const { name, description, isActive } = req.body;

        const existing = await Brand.findById(id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Brand not found" });
        }

        const logoUrl = req.file ? req.file.path : existing.logo;

        const brand = await Brand.findByIdAndUpdate(id, {
            name,
            description,
            logo:     logoUrl,
            isActive: isActive === 'true' || isActive === true
        });

        res.status(200).json({ success: true, message: "Brand updated successfully!", brand });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: "Brand with this name already exists." });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteBrand = async (req, res) => {
    try {
        const brand = await Brand.findByIdAndDelete(req.params.id);
        if (!brand) {
            return res.status(404).json({ success: false, message: "Brand not found" });
        }

        res.status(200).json({ success: true, message: "Brand deleted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};