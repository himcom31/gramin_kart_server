const Blog = require('../models/Blog');

exports.getAllBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find();
        res.status(200).json({ success: true, blogs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getBlogById = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }
        res.status(200).json({ success: true, blog });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.addBlog = async (req, res) => {
    try {
        const { title, category, tags, description } = req.body;
        const thumbnail = req.file ? req.file.path : null;

        if (!thumbnail) {
            return res.status(400).json({ success: false, message: "Blog thumbnail is required" });
        }

        // Normalise tags — can arrive as array or comma-separated string
        const parsedTags = tags
            ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean))
            : [];

        const blog = await Blog.create({
            title,
            category_id: Number(category),   // category ObjectId → integer FK
            tags:        parsedTags,
            description,
            thumbnail,
            author_id:   req.user.id          // req.user._id → req.user.id
        });

        res.status(201).json({ success: true, message: "Blog published!", blog });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateBlog = async (req, res) => {
    try {
        const { title, category, tags, description, isActive } = req.body;

        const updateData = {};

        if (title       !== undefined) updateData.title       = title;
        if (description !== undefined) updateData.description = description;
        if (category    !== undefined) updateData.category_id = Number(category);
        if (isActive    !== undefined) updateData.isActive    = isActive === 'true' || isActive === true;
        if (req.file)                  updateData.thumbnail   = req.file.path;

        if (tags !== undefined) {
            updateData.tags = Array.isArray(tags)
                ? tags
                : tags.split(',').map(t => t.trim()).filter(Boolean);
        }

        const blog = await Blog.findByIdAndUpdate(req.params.id, updateData);

        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }

        res.status(200).json({ success: true, message: "Blog updated!", blog });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.toggleBlogStatus = async (req, res) => {
    try {
        const blog = await Blog.toggleStatus(req.params.id);
        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }
        res.status(200).json({
            success: true,
            message: `Blog ${blog.isActive ? 'activated' : 'deactivated'}`,
            blog
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findByIdAndDelete(req.params.id);
        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }
        res.status(200).json({ success: true, message: "Blog deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};