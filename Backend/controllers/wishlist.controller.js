
import Wishlist from "../models/wishlist.model.js";

// Add a particular property to wishlist
export const addWishlist = async (req, res) => {
    try {
        const propertyId  = req.params.propertyId;
        const userId = req.user._id;

        // Check if property already exists in user's wishlist
        const existing = await Wishlist.findOne({
            user: userId,
            property: propertyId
        });

        if (existing) {
            return res.status(200).json({
                success: true,
                message: "Property is already in your wishlist"
            });
        }

        // Create wishlist
        await Wishlist.create({
            user: userId,
            property: propertyId
        });

        return res.status(201).json({
            success: true,
            message: "Property added to wishlist successfully"
        });

    } catch (error) {
        console.error("Add Wishlist Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};


// Get all properties from logged-in user's wishlist
export const getWishlist = async (req, res) => {
    try {
        const userId = req.user._id;

        const wishlist = await Wishlist.find({ user: userId })
            .populate("property")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Wishlist fetched successfully",
            total: wishlist.length,
            wishlist
        });

    } catch (error) {
        console.error("Get Wishlist Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};


// Remove a particular property from wishlist
export const removeWishlist = async (req, res) => {
    try {
        const propertyId  = req.params.propertyId;
        const userId = req.user._id;

        // Find and delete wishlist item
        const deletedWishlist = await Wishlist.findOneAndDelete({
            user: userId,
            property: propertyId
        });

        if (!deletedWishlist) {
            return res.status(404).json({
                success: false,
                message: "Property not found in your wishlist"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Property removed from wishlist successfully"
        });

    } catch (error) {
        console.error("Remove Wishlist Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
