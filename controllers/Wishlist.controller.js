// controllers/wishlistController.js
const { get } = require('mongoose');
const Wishlist = require('../models/Wishlist.model');

// Get Wishlist
const getWishlist = async (req, res) => {
    const userId = req.query.userId;

    if (!userId) return res.status(400).json({ message: 'userId is required' });

    try {
        const wishlist = await Wishlist.findOne({ user: userId }).populate('items');
        if (!wishlist) {
            return res.status(200).json({ message: 'Wishlist is empty', wishlist: { items: [] } });
        }
        res.status(200).json(wishlist);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

// Add to Wishlist
const addToWishlist = async (req, res) => {
    const { userId, productId } = req.body;

    if (!userId || !productId) return res.status(400).json({ message: 'userId and productId are required' });

    try {
        let wishlist = await Wishlist.findOne({ user: userId });

        if (!wishlist) {
            wishlist = new Wishlist({ user: userId, items: [] });
        }

        if (wishlist.items.includes(productId)) {
            return res.status(400).json({ message: 'Product already in wishlist' });
        }

        wishlist.items.push(productId);

        await wishlist.save();
        res.status(200).json({ message: 'Product added to wishlist', wishlist });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

// Remove from Wishlist
 const removeFromWishlist = async (req, res) => {
    const { userId, productId } = req.body;

    if (!userId || !productId) return res.status(400).json({ message: 'userId and productId are required' });

    try {
        let wishlist = await Wishlist.findOne({ user: userId });

        if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' });

        wishlist.items = wishlist.items.filter(item => item.toString() !== productId);

        await wishlist.save();
        res.status(200).json({ message: 'Product removed from wishlist', wishlist });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

module.exports={
    removeFromWishlist,
    getWishlist,
    addToWishlist
}
