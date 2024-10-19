//* Call the instance from the razorpay.js file inside config folder
const instance = require('../config/razorpay')
const courseModel = require('../models/courseModel');
const userModel = require('../models/userModel')
const { mailSender } = require('../utils/maILSender')
const { courseEnrollmentEmail } = require('../mail/templates/courseEnrollmentEmail');
const mongoose = require('mongoose')

//* Capture the payment and initiate the razorpay order
exports.capturePayment = async (req, res) => {
    try {
        //! Steps/LOGIC
        //* Get courseId and userId 
        const courseId = req.body.courseId;
        const userId = req.user.id;
        //* Validate these details
        if (!courseId) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide course ID'
            })
        }

        let courseDetail;
        try {
            //* Check is the courseId is valid or not
            courseDetail = await courseModel.findById(courseId);
            //* Validate the courseDetail
            if (!courseDetail) {
                return res.status(404).json({
                    status: 'fail',
                    message: 'Course not found!'
                })
            }
            //* Check if the user has already paid for the same course
            //! Now we will check from the enrolledStudents as it has objectId and the userId is in string, we need to convert it to objectId
            const uid = new mongoose.Types.ObjectId(userId);
            if (courseDetail.studentEnrolled.includes(uid)) {
                return res.status(204).json({
                    status: 'fail',
                    message: 'Student is already enrolled.'
                })
            }
        }
        catch (err) {
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
        //* Create order
        const amount = courseDetail.price;
        const currency = "INR";

        let options = {
            amount: amount * 100,
            currency,
            receipt: Math.random(Date.now()).toString(),
            notes: {
                courseId: courseId,
                userId
            }
        }

        try {
            //* Initiate the payment using razorpay
            const paymentResponse = instance.orders.create(options);
            console.log("Payment Response: ", paymentResponse)
            //* Send response
            return res.status(201).json({
                status: 'success',
                courseName: courseDetail.courseName,
                courseDescription: courseDetail.description,
                thumbnail: courseDetail.thumbnail,
                orderId: paymentResponse.id,
                currency: paymentResponse.currency,
                amount: paymentResponse.amount,
                message: 'Order created successfully!'
            })
        }
        catch (err) {
            return res.status(500).json({
                status: 'fail',
                data: "Failed to create an order",
                message: err.message
            })
        }


    }
    catch (err) {
        return res.status(500).json({
            status: 'fail',
            data: "Failed to while creating an order",
            message: err.message
        })
    }
}

//* Verify signature of razorpay and the server
exports.verifySignature = async (req, res) => {
    try {
        const webHookSecret = "12345678";   //* From server

        //* razorpay sends the secret key is sent in header in key of "x-razorpay-signature" and this is not sent directly. It is in hashed format as this might get breached in between
        const signature = req.headers["x-razorpay-signature"];

        //* Step A
        const shasum = crypto.createHmac("sha256", webHookSecret);  //* This creates the HMAC Object
        //* Step B -> Convert object to string format
        shasum.update(JSON.stringify(req.body));
        //* Step C -> written in copy
        const digest = shasum.digest("hex");

        //* Both the keys are matched and the order is authorized
        if (signature === digest) {
            console.log("Payment is authorized")

            //* get the courseId and userId from notes
            const { courseId, userId } = req.body.payload.payment.entity.notes;

            try {
                //* Fulfill the action

                //* Find the course and enroll the student in it
                const enrolledCourse = await courseModel.findOneAndUpdate(
                    { _id: courseId },
                    { $push: { studentEnrolled: userId } },
                    { new: true }
                )

                if (!enrolledCourse) {
                    return res.status(404).json({
                        status: 'fail',
                        message: 'Course not found!'
                    })
                }

                console.log("Enrolled Course", enrolledCourse);

                //* find the student and add the course to their courses
                const enrolledStudent = await userModel.findOneAndUpdate(
                    { _id: userId },
                    { $push: { courses: courseId } },
                    { new: true }
                )

                if (!enrolledStudent) {
                    return res.status(404).json({
                        status: 'fail',
                        message: 'Student not found!'
                    })
                }

                //* Send the confirmation mail to the student after buying the course successfully!
                const emailResponse = await mailSender(
                    enrolledStudent.email,
                    "Congratulations from Learnhub",
                    courseEnrollmentEmail(enrolledCourse.courseName, enrolledStudent.firstName + " " + enrolledStudent.lastName)
                )

                console.log(mailResponse);

                res.status(200).json({
                    status: 'success',
                    message: 'Signature verified and course added'
                })
            }
            catch (err) {
                return res.status(500).json({
                    status: 'success',
                    data: "Failed",
                    message: err.message
                })
            }
        } else {
            return res.status(500).json({
                status: 'success',
                data: "Failed to verify the signature",
                message: err.message
            })
        }
    }
    catch (err) {
        return res.status(500).json({
            status: 'success',
            data: "Failed",
            message: err.message
        })
    }
}