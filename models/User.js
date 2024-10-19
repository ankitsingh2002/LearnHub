const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    { // Always define model then first connect mongoose and made Schema inside the models's file
        firstName: {
            type: String,
            required: true,
            trim: true
        },
        lastName: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            trim: true
        },
        password: {
            type: String,
            required: true,
            trim: true
        },
        confirmPassowrd: {
            type: String,
            // required: true,
            default: undefined
        },
        image: {
            type: String,
        },
        accountType: {
            type: String,
            enum: ['Admin', 'Student', 'Instructor']
        },
        active: {
            type: Boolean,
            default: true
        },
        approved: {
            type: Boolean,
            default: true
        },
        token: {
            type: String,
            default: undefined
        },
        token_link: {
            type: String,
            default: undefined
        },
        resetPasswordExpires: {
            type: Date
        },
        additionalDetails: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Profile",
        },
        courses: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
        }],
        courseProgress: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "courseProgress"
        }],
    },
    //* The timestamps option in Mongoose schema automatically adds createdAt and updatedAt fields to the document.
    { timestamps: true }
)

module.exports = mongoose.model('User', userSchema);