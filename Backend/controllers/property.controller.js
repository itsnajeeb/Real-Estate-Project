
import Property from "../models/property.model.js";
import Inquiry from "../models/Inquary.model.js";
import { uploadToCloudinary } from "../utils/uploadCloudinary.js";
import cloudinary from "../config/cloudinary.js";
import mongoose from "mongoose";
import jwt from 'jsonwebtoken';

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



// GET ALL PROPERTIES WITH FILTERS
export const getAllProperties = async (req, res) => {
    try {
        const {
            city,
            area,
            pincode,
            propertyType,
            bhk,
            furnishing,
            status,
            minPrice,
            maxPrice,
            amenities,
            sort,
            seller,
            page = 1,
            limit = 12,
        } = req.query;

        // Escape special regex characters
        const escapeRegex = (value) =>
            value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        // Base query
        const query = {
            status: status || "sale",
        };

        // Seller filter
        if (seller) {
            if (!mongoose.Types.ObjectId.isValid(seller)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid seller ID",
                });
            }

            query.seller = seller;
        }

        // City filter
        if (city) {
            query.city = new RegExp(escapeRegex(city.trim()), "i");
        }

        // Area filter
        if (area) {
            query.area = new RegExp(escapeRegex(area.trim()), "i");
        }

        // Pincode filter
        if (pincode) {
            query.pincode = pincode.trim();
        }

        // Property type filter
        if (propertyType) {
            const types = propertyType
                .split(",")
                .map((type) => type.trim())
                .filter(Boolean);

            if (types.length) {
                query.propertyType = {
                    $in: types.map(
                        (type) => new RegExp(`^${escapeRegex(type)}$`, "i")
                    ),
                };
            }
        }

        // BHK filter
        if (bhk) {
            if (bhk === "5+") {
                // Your addProperty controller stores BHK as a string
                query.bhk = {
                    $regex: /^(5\+|[5-9]\d*)$/,
                };
            } else {
                query.bhk = String(bhk);
            }
        }

        // Furnishing filter
        if (furnishing) {
            const furnishingArray = furnishing
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);

            query.furnishing = {
                $in: furnishingArray.map(
                    (item) => new RegExp(`^${escapeRegex(item)}$`, "i")
                ),
            };
        }

        // Price filter
        if (minPrice !== undefined || maxPrice !== undefined) {
            const min = minPrice !== undefined ? Number(minPrice) : undefined;
            const max = maxPrice !== undefined ? Number(maxPrice) : undefined;

            if (
                (min !== undefined && (!Number.isFinite(min) || min < 0)) ||
                (max !== undefined && (!Number.isFinite(max) || max < 0))
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid price range",
                });
            }

            if (min !== undefined && max !== undefined && min > max) {
                return res.status(400).json({
                    success: false,
                    message: "Minimum price cannot exceed maximum price",
                });
            }

            query.price = {};

            if (min !== undefined) query.price.$gte = min;
            if (max !== undefined) query.price.$lte = max;
        }

        // Amenities filter
        if (amenities) {
            const amenitiesArray = amenities
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);

            if (amenitiesArray.length) {
                query.amenities = {
                    $in: amenitiesArray,
                };
            }
        }

        // Sorting
        let sortOption = { createdAt: -1 };

        switch (sort) {
            case "priceLow":
                sortOption = { price: 1 };
                break;

            case "priceHigh":
                sortOption = { price: -1 };
                break;

            case "latest":
                sortOption = { createdAt: -1 };
                break;
        }

        // Pagination
        const currentPage = Math.max(1, Number(page) || 1);
        const pageLimit = Math.min(50, Math.max(1, Number(limit) || 12));

        const skip = (currentPage - 1) * pageLimit;

        // Fetch properties and total count
        const [properties, totalProperties] = await Promise.all([
            Property.find(query)
                .populate("seller", "name phone profilePic")
                .sort(sortOption)
                .skip(skip)
                .limit(pageLimit)
                .lean(),

            Property.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            count: properties.length,
            totalProperties,
            totalPages: Math.ceil(totalProperties / pageLimit),
            currentPage,
            properties,
        });

    } catch (error) {
        console.error("GET_ALL_PROPERTIES_ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching properties",
        });
    }
};



// GET PROPERTY DETAILS
export const getPropertyDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate property ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid property ID",
            });
        }

        // Fetch property details
        const property = await Property.findById(id)
            .populate("seller", "name phone profilePic");

        if (!property) {
            return res.status(404).json({
                success: false,
                message: "Property not found",
            });
        }

        // Identify visitor
        let visitorId = req.ip;

        // Check authentication token
        const authHeader = req.headers.authorization;

        if (authHeader?.startsWith("Bearer ")) {
            try {
                const token = authHeader.split(" ")[1];

                const decoded = jwt.verify(
                    token,
                    process.env.JWT_SECRET
                );

                visitorId = decoded.id;

            } catch (error) {
                // Invalid token: continue as guest
            }
        }

        // Check whether seller is viewing own property
        const sellerId = property.seller?._id?.toString();

        const isSellerChecking =
            sellerId && visitorId === sellerId;

        // Track unique views atomically
        if (!isSellerChecking && visitorId) {
            const updatedProperty = await Property.findOneAndUpdate(
                {
                    _id: id,
                    viewedBy: { $ne: visitorId },
                },
                {
                    $addToSet: { viewedBy: visitorId },
                    $inc: { views: 1 },
                },
                {
                    new: true,
                }
            );

            // Update response object if view was counted
            if (updatedProperty) {
                property.views = updatedProperty.views;
            }
        }

        // Find similar properties
        const similarProperties = await Property.find({
            _id: { $ne: property._id },
            city: property.city,
            propertyType: property.propertyType,
            status: property.status,
        })
            .sort({ createdAt: -1 })
            .limit(4)
            .select(
                "title price images city area propertyType bhk areaSize status"
            )
            .lean();

        return res.status(200).json({
            success: true,
            property,
            similarProperties,
        });

    } catch (error) {
        console.error("GET_PROPERTY_DETAILS_ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching property details",
        });
    }
};


// SELLER DASHBOARD
export const getSellerDashboard = async (req, res) => {
    try {
        const sellerId = req.user._id;

        // Run all queries simultaneously
        const [
            totalProperties,
            activeListings,
            soldProperties,
            totalInquiries,
            viewsData,
        ] = await Promise.all([

            // Total properties
            Property.countDocuments({
                seller: sellerId,
            }),

            // Active listings
            Property.countDocuments({
                seller: sellerId,
                status: "available",
            }),

            // Sold properties
            Property.countDocuments({
                seller: sellerId,
                status: "sold",
            }),

            // Total inquiries
            Inquiry.countDocuments({
                seller: sellerId,
            }),

            // Total property views
            Property.aggregate([
                {
                    $match: {
                        seller: sellerId,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalViews: {
                            $sum: {
                                $ifNull: ["$views", 0],
                            },
                        },
                    },
                },
            ]),
        ]);

        const totalViews = viewsData[0]?.totalViews || 0;

        return res.status(200).json({
            success: true,
            message: "Seller dashboard data fetched successfully",
            stats: {
                totalProperties,
                activeListings,
                soldProperties,
                totalInquiries,
                totalViews,
            },
        });

    } catch (error) {
        console.error("GET_SELLER_DASHBOARD_ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching seller dashboard",
        });
    }
};


// GET PROPERTY COUNTS BY TYPE
export const getPropertyCounts = async (req, res) => {
    try {
        const counts = await Property.aggregate([
            {
                $match: {
                    status: "sale",
                },
            },
            {
                $group: {
                    _id: "$propertyType",
                    count: { $sum: 1 },
                },
            },
        ]);

        // Format counts into an object
        const formattedCounts = counts.reduce((acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
        }, {});

        return res.status(200).json({
            success: true,
            counts: formattedCounts,
        });

    } catch (error) {
        console.error("GET_PROPERTY_COUNTS_ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching property counts",
        });
    }
};


