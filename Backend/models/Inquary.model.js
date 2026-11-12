import mongoose from "mongoose";

const InquarySchema = new mongoose.Schema({

    property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Propery",
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


const Inquary = mongoose.model("Inquary", InquarySchema)


export default Inquary;