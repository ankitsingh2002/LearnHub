const bcrypt = require('bcrypt')
const User = require('../models/User');
const { passwordUpdated } = require('../mail/templates/passwordUpdate')
const { mailSender } = require('../utils/maILSender');

// Reset Password Token
exports.resetPasswordToken = async (req, res) => { 
    try {

        // *get email from the req.body
        const email = req.body.email;

        //* validate the email data
        if (!email) {
            return res.status(400).json({
                status: 'fail',
                message: 'Enter the email address'
            })
        }
        //* Check if the user is registered or not
        const exisitingUser = await User.findOne({ email: email }).populate('additionalDetails').exec();
        if (!exisitingUser) {
            return res.status(400).json({
                status: 'fail',
                message: 'User not found!'
            })
        }

        //* Generate Token
        const token = crypto.randomUUID();
        console.log("Generate random token -> ", token)

        //* Update user model by additing token and expiration time of the reset password link
        const updatedDetails = await userModel.findOneAndUpdate(
            { email: email },
            {
                token_link: token,
                resetPasswordExpires: new Date(Date.now() + 5 * 60 * 1000)  // 5 mins
            },
            { new: true } // this is show updated document, dont show old document
        )
            .populate("additionalDetails").exec();

        //* Create URL -> forntend link create
        const url = `http://localhost:3000/update-password/${token}`;
        //* Send Mail containing the url -> the url will include port 3000 as we are opening the frontend UI and will be working on port 3000 when we build frontend    
        await mailSender(email, 'Password Reset link', `Password Reset link: ${url}`)

        //* Return response
        return res.status(200).json({
            status: 'success',
            message: 'Email sent successfully! Please check the email to create a new password'
        })
    }
    catch (err) {
        res.status(500).json({
            status: 'fail',
            data: 'Failed to send the mail to create the new password',
            message: err.message
        })
    }
}

// ResetPassword
exports.resetPassword = async (req, res) => {
    try {
        //* Get the data from the req body
        const { token, newPassword, confirmPassword } = req.body

        //* Validate the fetched data
        if (!token || !newPassword || !confirmPassword) {
            return res.status(400).send('Fill all the fields')
        }

        // check if the new password and confirmPassword matches or not
        if (newPassword !== confirmPassword) {
            return res.status(404).send('Both passwords doesn\'t match');
        }

        // Check the token is present in the user or not
        const exisitingUser = await userModel.findOne({ token_link: token });

        if (!exisitingUser) {
            return res.status(404).json({
                status: 'fail',
                message: 'URL not found. Please generate the URL'
            })
        }

        if (Date.now() > exisitingUser.resetPasswordExpires) {
            return res.status(404).json({
                status: 'fail',
                message: 'Link has expired. Please regenerate the link'
            })
        }

        if (exisitingUser.token_link === token) {
            // update the password
            const hashedPassword = await bcrypt.hash(newPassword, 10)
            console.log("Hashed password ", hashedPassword)
            const user = await userModel.findOneAndUpdate(
                { token_link: token },
                {
                    password: hashedPassword,
                    token_link: null
                },
                { new: true }
            )
                .populate('additionalDetails').exec()

            //* Send Mail to user about the password is updated successfully!
            const body = passwordUpdated(exisitingUser.email, exisitingUser.firstName + " " + exisitingUser.lastName)
            await mailSender(user.email, "Password updated successfully!", body);
            console.log("Mail sent successully!");
            return res.status(200).json({
                status: 'success',
                user,
                message: 'SUCCESS! Password updated successfully!'
            })
        }
    }
    catch (err) {
        return res.status(500).json({
            status: 'fail',
            data: 'Failed to reset the password',
            message: err.message
        })
    }
}