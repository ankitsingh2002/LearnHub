const jwt = require('jsonwebtoken')

require('dotenv').config();
const User = require("../models/User");

// authenticate the token
exports.auth = async (req, res, next) => {
    try {
        const token = req.body.token || req.cookies.token //|| req.header("Authorization").replace("Bearer ", "");
        console.log("TOKEN: ", token)
        if (!token) {
            return res.status(404).json({
                status: 'fail',
                message: 'Token has expired. Please Login again'
            })
        }

        //verify the token
        try {
            const decode = jwt.verify(token, process.env.JWT_SECRET);
            console.log('Decode: ', decode)
            req.user = decode;
        }
        catch (err) {
            res.status(500).json({
                status: 'fail',
                message: err.message,
                data: 'Failed to decode the jwt'
            })
        }
        next();
    }
    catch (err) {
        res.status(500).json({
            status: 'fail',
            message: err.message,
            data: 'Failed to authenicate'
        })
    }
}

//? Authorization
// isStudent
exports.isStudent = async (req, res, next) => {
    try {
        if (req.user.accountType !== 'Student') {
            return res.status(400).json({
                status: 'fail',
                message: 'Only students are allowed'
            })
        }
        next();
        //* Authenticated as a 'Student'
        // res.status(200).json({
        //     status: 'success',
        //     message: 'Welcome to the Students dashboard'
        // })
    }
    catch (err) {
        res.status(500).json({
            status: 'fail',
            message: err.message,
            data: 'Failed to authorize as student'
        })
    }
}

// isInstructor
exports.isInstructor = async (req, res, next) => {
    try {
        if (req.user.accountType !== 'Instructor') {
            return res.status(400).json({
                status: 'fail',
                message: 'Only Instructor\'s are allowed'
            })
        }
        next();
        //* Authenticated as a 'Student'
        // res.status(200).json({
        //     status: 'success',
        //     message: 'Welcome to the Instructor\'s dashboard'
        // })
    }
    catch (err) {
        res.status(500).json({
            status: 'fail',
            message: err.message,
            data: 'Failed to authorize as a Instructor'
        })
    }
}


// isAdmin
exports.isAdmin = async (req, res, next) => {
    try {
        if (req.user.accountType !== 'Admin') {
            return res.status(400).json({
                status: 'fail',
                message: 'Only Admin\'s are allowed'
            })
        }

        next();

        //* Authenticated as a 'Student'
        // res.status(200).json({
        //     status: 'success',
        //     message: 'Welcome to the Admin\'s dashboard'
        // })
    }
    catch (err) {
        res.status(500).json({
            status: 'fail',
            message: err.message,
            data: 'Failed to authorize as an Admin'
        })
    }
}

