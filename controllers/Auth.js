const User = require("../models/User");
const OTP = require("../models/OTP");
const otpGenerator = require("otp-generator");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");

require('dotenv').config();


// Send OTP
exports.sendOTP = async (req, res) => {
    try {
        //* Fetch the email from req.body
        const email = req.body.email;

        if (!email) {
            return res.status(400).send('Enter the email')
        }

        //* Check if the user already exists
        const exisitingUser = await userModel.findOne({ email });
        //* If yes, then return
        if (exisitingUser) {
            return res.status(409).json({
                status: 'fail',
                message: 'User already exists.'
            })
        }

        //* Generate the otp with the help of the otp Generator in helper function
        function generateOTP() {
            return otpGenerator.generate(6,
                {
                    lowerCaseAlphabets: false,
                    upperCaseAlphabets: false,
                    specialChars: false
                })
        }

        var newOTP = generateOTP();
        //* Check if the OTP is unique or not
        var exisitingOTP = await otpModel.findOne({ otp: newOTP })

        while (exisitingOTP) {
            newOTP = generateOTP();
            exisitingOTP = await otpModel.findOne({ otp: newOTP })
        }

        //* Store the OTP in the DB
        const storingOTP = await otpModel.create({ email, otp: newOTP });

        console.log("OTP Stored successfully! ", storingOTP);

        res.status(201).json({
            status: 'success',
            message: 'OTP sent successfully!'
        })
    }
    catch (err) {
        res.status(500).json({
            status: 'fail',
            data: 'Failed to create a new OTP',
            message: err.message
        })
    }
}


// Signup
exports.signup = async (req, res) => {
    try {

        // data fetch from request body
        const { firstName, lastName, email, password, confirmPassowrd, phoneNumber,  accountType, otp } = req.body;  // contactNumber

        //* validate all the data
        if (!firstName || !lastName || !email || !password || !confirmPassowrd || !phoneNumber || !accountType || !otp) {
            return res.status(400).json({
                status: 'fail',
                message: 'Fill all the fields'
            })
        }

        //* validate the password and confirmPassword  
        if (password !== confirmPassowrd) {
            return res.status(400).json({
                status: 'fail',
                message: 'Passwords doesn\'t match'
            })
        }

        //* Check if the user already exists
        const exisitingUser = await userModel.findOne({ email: email });
        if (exisitingUser) {
            return res.status(409).json({
                status: 'fail',
                message: 'User already exists. Please Login :)'
            })
        }

        //Find most recent OTP stored for the user -> As there can be multiple OTP's generated
        const recentOTP = await otpModel.findOne({ email }).sort({ createdAt: -1 }).limit(1)
        console.log("recent OTP: ", recentOTP)
        // validate the OTP
        if (recentOTP.length === 0) {
            // OTP not found
             return res.status(400).json({
                status: 'fail',
                message: 'OTP not found'
            })
        }
        else if (otp !== recentOTP.otp) {
            // INVALID OTP
            return res.status(409).json({
                status: 'fail',
                message: 'Invalid OTP'
            })
        }

        //* Hash the password using Bcrypt
        let hashedPassword;
        try {
            hashedPassword = await bcrypt.hash(password, 10);
            console.log('Password hashed successfully: ', hashedPassword)
        }
        catch (err) {
            console.log('Error occured during hashing the password ', err.message)
        }

        //* Store this entry in the DB
        const profileDetails = await profileModel.create({
            gender: null,
            dob: null,
            about: null,
            phoneno: phoneNumber
        })

        const result = await userModel.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            accountType: accountType,
            image: `https://api.dicebear.com/8.x/initials/svg?seed=${firstName}%20${lastName}`,
            additionalDetails: profileDetails
        })

        console.log('New user created ', result);

        res.status(201).json({
            status: 'success',
            result,
            message: 'Created a new user'
        })
    }
    catch (err) {
        res.status(500).json({
            status: 'fail',
            data: 'Failed to create a new user',
            message: err.message
        })
    }
}

// Login
exports.login = async (req, res) => {
    try{

        // fetch the data  and , get data from request body
        const { email, password } = req.body;

        // validate the data
        if (!email || !password) {
            return res.status(400).send('Fill all the fields')
        }

        // Check if the user is already registered or not
        const exisitingUser = await userModel.findOne({ email })
            .populate({ path: "additionalDetails" })
            .populate({
                path: 'courses',
                populate: {
                    path: 'tag'
                }
            })
            .exec();
        console.log("Account Type: ", exisitingUser.accountType)
        if (!exisitingUser) {
            return res.status(404).json({
                status: 'fail',
                message: 'User is not registered. Please Signup'
            })
        }

        //* Check if the entered password matches the db password
        const response = await bcrypt.compare(password, exisitingUser.password);
        if (!response) {
            return res.status(400).json({
                status: 'fail',
                message: 'Bad Credentials!'
            })
        }

        // Create a token, generate JWT Token after password matching
        let token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' })
        exisitingUser.token = token;
        exisitingUser.password = undefined
        console.log("TOKEN: ", token);
        if (!token) {
            return res.status(404).json({
                status: 'fail',
                message: 'Token not found'
            })
        }

        //* Sending the cookie back to the client
        const options = {
            expires: new Date(Date.now() + 2 * 60 * 60 * 1000),
            httpOnly: true
        }
        res.cookie("token", token, options).status(200).json({
            status: 'success',
            token,
            exisitingUser,
            message: 'Logged In successfully!',
        })
    }
    catch(error){
        return res.status(500).json({
            status: 'fail',
            message: err.message,
            data: 'Failed to login!'
        })
    }
};


// ChangePassword
exports.changePassword = async (req, res) => {
    try {
        //* Fetch the data from the req.body
        const { email, oldPassword, newPassword, confirmPassowrd } = req.body;

        //* Validate the entered details
        if (!email || !oldPassword || !newPassword || !confirmPassowrd) {
            return res.status(400).json({
                status: 'fail',
                message: 'Enter all the details'
            })
        }

        //* Check if the new entered password and confirmPassword are same or not
        if (newPassword !== confirmPassowrd) {
            return res.status(404).json({
                status: 'fail',
                message: 'New password and confirm password should be same'
            })
        }

        //* Check if the user exists or not
        const exisitingUser = await userModel.findOne({ email: email })
            .populate("additionalDetails")
            // .populate("course")
            // .populate("courseProgress")
            .exec();

        //* IF user is not registered
        if (!exisitingUser) {
            return res.status(404).json({
                status: 'fail',
                message: "User doesn\'t exist"
            })
        }

        //* Check if the old password matches or not
        const passwordRes = await bcrypt.compare(oldPassword, exisitingUser.password)
        if (!passwordRes) {
            return res.status(404).json({
                status: 'fail',
                message: 'Old Password doesn\'t match'
            })
        }

        // * Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        //* Now update the DB with the new password
        const newData = await userModel.findOneAndUpdate(
            { email: email },
            { password: hashedPassword },
            { new: true }
        )
            .populate("additionalDetails")
            .exec();

        //* Send Mail to user about the password is updated successfully!
        // const body = `<div>
        //     <h1> Hi ${exisitingUser.firstName} ${exisitingUser.lastName}  </h1>
        //     <h2> Password Updated Successfully! </h2>
        //     <p> If not you. Please report</p>
        // </div>`

        const body = passwordUpdated(exisitingUser.email, exisitingUser.firstName + " " + exisitingUser.lastName)
        await mailSender(exisitingUser.email, "Password updated successfully!", body)
        console.log("Mail sent successully!");
        res.status(201).json({
            status: 'success',
            message: 'Password updated successfully',
            newData
        })
    }
    catch (err) {
        res.status(500).json({
            status: 'fail',
            data: 'Failed to reset the password',
            message: err.message
        })
    }
}

    