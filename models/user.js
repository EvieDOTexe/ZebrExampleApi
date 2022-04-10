const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    profilePicture: {
        type: String,
        default: "./userImages/default.jpg"
    },
    dob: {
        type: Date,
        required: true
    },
    currentAge: {
        type: Number,
        default: 0
    },
    bio: {
        type: String,
        default: ""
    },

}, { timestamps: true });

const User = mongoose.model('user', userSchema);

module.exports = User;