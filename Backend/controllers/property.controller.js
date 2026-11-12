
import Property from "../models/property.model.js";
import Inquiry from "../models/Inquiry.model.js";
import { uploadToCloudinary } from "../utils/uploadCloudinary.js";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";

// ADD A PROPERTY
export const addProperty = async (req, res) => {
    try {
        const {
            title,
            description,
            price,
            city,
            area,
            pincode,
            propertyType,
            bhk,
            bathrooms,
            areaSize,
            furnishing,
            status,
            amenities,
        } = req.body;

        // Validate required fields
        if (
            !title ||
            !description ||
            !price ||
            !city ||
            !area ||
            !pincode ||
            !propertyType
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields",
            });
        }

        // Upload images to Cloudinary
        let imageUrls = [];

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const result = await uploadToCloudinary(
                    file.buffer,
                    "properties"
                );

                imageUrls.push(result.secure_url);
            }
        }

        // Parse amenities
        let parsedAmenities = [];

        if (amenities) {
            if (Array.isArray(amenities)) {
                parsedAmenities = amenities;
            } else {
                try {
                    parsedAmenities = JSON.parse(amenities);

                    if (!Array.isArray(parsedAmenities)) {
                        parsedAmenities = [String(amenities)];
                    }
                } catch {
                    parsedAmenities = amenities
                        .split(",")
                        .map(item => item.trim())
                        .filter(Boolean);
                }
            }
        }

        // Create property
        const property = await Property.create({
            title: title.trim(),
            description,
            price: Number(price),
            city,
            area,
            pincode,
            propertyType,
            bhk: bhk ? String(bhk) : undefined,
            bathrooms: bathrooms ? Number(bathrooms) : undefined,
            areaSize: areaSize ? Number(areaSize) : undefined,
            furnishing,
            status,
            images: imageUrls,
            seller: req.user._id,
            amenities: parsedAmenities,
        });

        return res.status(201).json({
            success: true,
            message: "Property added successfully",
            property,
        });

    } catch (error) {
        console.error("ADD_PROPERTY_ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error while adding property",
        });
    }
};


// GET MY PROPERTIES
export const getMyProperties = async (req, res) => {
    try {
        const properties = await Property.find({
            seller: req.user._id,
        }).sort({ createdAt: -1 }).populate("seller", "name profilePic");

        return res.status(200).json({
            success: true,
            count: properties.length,
            properties,
        });

    } catch (error) {
        console.error("GET_MY_PROPERTIES_ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching your properties",
        });
    }
};


// UPDATE PROPERTY
export const updateProperty = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate property ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid property ID",
            });
        }

        // Find property
        const property = await Property.findById(id);

        if (!property) {
            return res.status(404).json({
                success: false,
                message: "Property not found",
            });
        }

        // Check ownership
        if (property.seller.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to update this property",
            });
        }

        // Allowed fields
        const fields = [
            "title",
            "description",
            "price",
            "city",
            "area",
            "pincode",
            "propertyType",
            "bhk",
            "bathrooms",
            "areaSize",
            "furnishing",
            "status",
        ];

        // Update basic fields
        fields.forEach((field) => {
            if (req.body[field] !== undefined) {
                property[field] = req.body[field];
            }
        });

        // Convert numeric fields
        if (req.body.price !== undefined) {
            property.price = Number(req.body.price);
        }

        if (req.body.bathrooms !== undefined) {
            property.bathrooms =
                req.body.bathrooms === ""
                    ? undefined
                    : Number(req.body.bathrooms);
        }

        if (req.body.areaSize !== undefined) {
            property.areaSize =
                req.body.areaSize === ""
                    ? undefined
                    : Number(req.body.areaSize);
        }

        if (req.body.bhk !== undefined) {
            property.bhk = req.body.bhk
                ? String(req.body.bhk)
                : undefined;
        }

        // Update amenities
        if (req.body.amenities !== undefined) {
            try {
                const amenities =
                    typeof req.body.amenities === "string"
                        ? JSON.parse(req.body.amenities)
                        : req.body.amenities;

                if (!Array.isArray(amenities)) {
                    return res.status(400).json({
                        success: false,
                        message: "Amenities must be an array",
                    });
                }

                property.amenities = amenities;

            } catch {
                return res.status(400).json({
                    success: false,
                    message: "Invalid amenities format",
                });
            }
        }

        // Handle existing images
        if (req.body.existingImages !== undefined) {
            let existingImages;

            try {
                existingImages =
                    typeof req.body.existingImages === "string"
                        ? JSON.parse(req.body.existingImages)
                        : req.body.existingImages;
            } catch {
                return res.status(400).json({
                    success: false,
                    message: "Invalid existing images format",
                });
            }

            if (!Array.isArray(existingImages)) {
                return res.status(400).json({
                    success: false,
                    message: "Existing images must be an array",
                });
            }

            // Only retain images already belonging to this property
            const currentImages = property.images || [];

            property.images = existingImages.filter((image) =>
                currentImages.includes(image)
            );
        }

        // Upload new images
        if (req.files && req.files.length > 0) {
            const newImages = [];

            for (const file of req.files) {
                const result = await uploadToCloudinary(
                    file.buffer,
                    "properties"
                );
                newImages.push(result.secure_url);
            }

            property.images = [
                ...(property.images || []),
                ...newImages,
            ];
        }

        // Save property
        const updatedProperty = await property.save();

        return res.status(200).json({
            success: true,
            message: "Property updated successfully",
            property: updatedProperty,
        });

    } catch (error) {
        console.error("UPDATE_PROPERTY_ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
};


// DELETE PROPERTY
export const deleteProperty = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate property ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid property ID",
            });
        }

        // Find property and check ownership
        const property = await Property.findOne({
            _id: id,
            seller: req.user._id,
        });

        if (!property) {
            return res.status(404).json({
                success: false,
                message: "Property not found or you are not authorized",
            });
        }

        // Extract Cloudinary public_id from image URL
        const getPublicId = (imageUrl) => {
            const url = new URL(imageUrl);
            const parts = url.pathname.split("/");

            const uploadIndex = parts.indexOf("upload");

            if (uploadIndex === -1) return null;

            let imageParts = parts.slice(uploadIndex + 1);

            // Remove transformations and version
            const versionIndex = imageParts.findIndex(part =>
                /^v\d+$/.test(part)
            );

            if (versionIndex !== -1) {
                imageParts = imageParts.slice(versionIndex + 1);
            } else if (imageParts[0]?.includes(",")) {
                imageParts.shift();
            }

            // Remove file extension
            const lastIndex = imageParts.length - 1;

            imageParts[lastIndex] = imageParts[lastIndex]
                .replace(/\.[^/.]+$/, "");

            return imageParts.join("/");
        };

        // Delete property from MongoDB first
        await Property.findByIdAndDelete(id);

        // Delete images from Cloudinary
        const cleanupResults = await Promise.allSettled(
            (property.images || []).map(async (imageUrl) => {
                const publicId = getPublicId(imageUrl);

                if (!publicId) return;

                return cloudinary.uploader.destroy(publicId);
            })
        );

        const failedDeletions = cleanupResults.filter(
            result => result.status === "rejected"
        );

        return res.status(200).json({
            success: true,
            message: "Property deleted successfully",
            cloudinaryCleanup:
                failedDeletions.length === 0
                    ? "All images deleted"
                    : "Some images could not be deleted",
        });

    } catch (error) {
        console.error("DELETE_PROPERTY_ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error while deleting property",
        });
    }
};


// UPDATE PROPERTY STATUS
export const updatePropertiesStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate property ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid property ID",
            });
        }

        // Validate status
        // const allowedStatus = ["available", "sold", "rented"];
        const allowedStatus = ["sale", "sold"];

        if (!status || !allowedStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid property status",
            });
        }

        // Find property
        const property = await Property.findById(id);

        if (!property) {
            return res.status(404).json({
                success: false,
                message: "Property not found",
            });
        }

        // Check ownership
        if (property.seller.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to update this property",
            });
        }

        // Update status
        property.status = status;

        await property.save();

        return res.status(200).json({
            success: true,
            message: "Property status updated successfully",
            property,
        });

    } catch (error) {
        console.error("UPDATE_PROPERTY_STATUS_ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
};


