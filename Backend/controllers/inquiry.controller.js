
import mongoose from "mongoose";
import Inquiry from "../models/inquiry.model.js";
import Property from "../models/property.model.js";

// BUYER SEND INQUIRY
export const sendInquiry = async (req, res) => {
    try {
        const { propertyId, message } = req.body;

        // Validate required fields
        if (!propertyId || !message?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Property ID and message are required",
            });
        }

        // Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(propertyId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid property ID",
            });
        }

        // Find property
        const property = await Property.findById(propertyId);

        if (!property) {
            return res.status(404).json({
                success: false,
                message: "Property not found",
            });
        }

        // Prevent seller from contacting themselves
        if (property.seller.toString() === req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You cannot send an inquiry to your own property",
            });
        }

        // Check property availability
        if (property.status !== "sale") {
            return res.status(400).json({
                success: false,
                message: "This property is currently not available",
            });
        }

        // Create inquiry
        const inquiry = await Inquiry.create({
            property: property._id,
            buyer: req.user._id,
            seller: property.seller,
            message: message.trim(),
        });

        return res.status(201).json({
            success: true,
            message: "Inquiry sent successfully",
            inquiry,
        });

    } catch (error) {
        console.error("SEND_INQUIRY_ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error while sending inquiry",
        });
    }
};


// GET SELLER INQUIRIES
export const getSellerInquiry = async (req, res) => {
    try {
        const inquiries = await Inquiry.find({
            seller: req.user._id,
        })
            .populate("buyer", "name email phone")
            .populate("property", "title price city area")
            .sort({ createdAt: -1 });


        return res.status(200).json({
            success: true,
            message: "Seller inquiries fetched successfully",
            count: inquiries.length,
            inquiries,
        });

    } catch (error) {
        console.error("GET_SELLER_INQUIRY_ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching seller inquiries",
        });
    }
};


// Mark inquiries as read
export const markAsRead = async (req, res) => {
    try {
        const inquiry = await Inquiry.findById(req.params.id);
        if (!inquiry) {
            return res.status(404).json({
                success: false,
                message: "Inquiry Not Found!"
            });
        }
        inquiry.isRead = true;
        await inquiry.save();

        res.status(200).json({
            success: true,
            message: "Marked as read"
        });


    } catch (error) {
        console.error("MARK_AS_READ_ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error while Mark as read",
        });
    }
}


