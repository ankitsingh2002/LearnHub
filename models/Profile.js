const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    gender: {
        type: String,
    },
    dob: {
        type: String,
    },
    about: {
        type: String,
        trim: true
    },
    phoneno: {
        type: Number,
        trim: true
    },
})

module.exports = mongoose.model('Profile', profileSchema);
