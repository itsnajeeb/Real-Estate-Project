import mongoose from "mongoose";

const InquirySchema = new mongoose.Schema({

    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
        required: true
    },

    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    message: {
        type: String,
        required: true
    },

    isRead: {
        type: Boolean,
        default: false
    }
},{ timestamps: true });


const Inquiry = mongoose.model("Inquiry", InquirySchema)


export default Inquiry;