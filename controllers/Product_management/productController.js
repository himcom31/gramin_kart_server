const Product  = require('../../models/product_Management/Product');

exports.addProduct = async (req, res) => {
    try {
        const thumbnail = req.files?.['thumbnail']?.[0]?.path ?? null;
        const additionalImages = req.files?.['additionalImages']?.map(f => f.path) ?? [];

        if (!thumbnail) {
            return res.status(400).json({ success: false, message: "Main Thumbnail is required" });
        }

        const {
            name, category, sku, buyingPrice, sellingPrice,
            stockQuantity, metaKeywords, attributes, brand, ...rest
        } = req.body;

        const product = await Product.create({
            ...rest,
            name,
            sku,
            category_id:      Number(category),
            brand_id:         brand ? Number(brand) : null,
            buyingPrice:      Number(buyingPrice),
            sellingPrice:     Number(sellingPrice),
            stockQuantity:    Number(stockQuantity),
            thumbnail,
            additionalImages,
            metaKeywords:     metaKeywords ? JSON.parse(metaKeywords) : [],
            attributes: (() => {
                try { return attributes ? JSON.parse(attributes) : []; }
                catch { return []; }
            })(),
            createdBy: req.user.id,
        });

        res.status(201).json({ success: true, message: "Product Added successfully!", product });

    } catch (error) {
        console.error("Add Product Error:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

exports.getAllProducts = async (req, res) => {
    try {
        const page       = parseInt(req.query.page)     || 1;
        const limit      = parseInt(req.query.limit)    || 10;
        const search     = req.query.search             || "";
        const categoryId = req.query.category           || "";

        const filters = {};
        if (search)     filters.search      = search;
        if (categoryId) filters.category_id = Number(categoryId);

        const products      = await Product.find(filters, { limit, skip: (page - 1) * limit });
        const totalProducts = await Product.countDocuments(filters);

        res.status(200).json({
            success:      true,
            count:        products.length,
            totalProducts,
            totalPages:   Math.ceil(totalProducts / limit),
            currentPage:  page,
            products,
        });

    } catch (error) {
        console.error("Get Products Error:", error.message);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        res.status(200).json({ success: true, product });

    } catch (error) {
        console.error("Get Product Error:", error.message);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const existing = await Product.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const newThumbnail       = req.files?.['thumbnail']?.[0]?.path ?? null;
        const newAdditionalImages = req.files?.['additionalImages']?.map(f => f.path) ?? null;

        const {
            name, category, sku, buyingPrice, sellingPrice,
            stockQuantity, metaKeywords, attributes, brand, ...rest
        } = req.body;

        const updateData = { ...rest };

        if (name          !== undefined) updateData.name          = name;
        if (sku           !== undefined) updateData.sku           = sku;
        if (category      !== undefined) updateData.category_id   = Number(category);
        if (brand         !== undefined) updateData.brand_id      = Number(brand);
        if (buyingPrice   !== undefined) updateData.buyingPrice   = Number(buyingPrice);
        if (sellingPrice  !== undefined) updateData.sellingPrice  = Number(sellingPrice);
        if (stockQuantity !== undefined) updateData.stockQuantity = Number(stockQuantity);
        if (newThumbnail)                updateData.thumbnail      = newThumbnail;

        if (newAdditionalImages)         updateData.additionalImages = newAdditionalImages;
        if (metaKeywords !== undefined)  updateData.metaKeywords     = metaKeywords ? JSON.parse(metaKeywords) : [];
        if (attributes   !== undefined)  updateData.attributes = (() => {
            try { return attributes ? JSON.parse(attributes) : []; }
            catch { return []; }
        })();

        const product = await Product.findByIdAndUpdate(req.params.id, updateData);

        res.status(200).json({ success: true, message: "Product updated successfully!", product });

    } catch (error) {
        console.error("Update Product Error:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        res.status(200).json({ success: true, message: "Product deleted successfully!" });

    } catch (error) {
        console.error("Delete Product Error:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};