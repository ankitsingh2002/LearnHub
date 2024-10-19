const { default: mongoose } = require("mongoose");
const courseModel = require("../models/courseModel");
const ratingAndReviewsModel = require("../models/ratingAndReviewsModel");

exports.createRating = async (req, res) => {
    try {
        //get user ID
        const userId = req.user.id;

        //* Fetch the data
        const { courseId, rating, review } = req.body;

        //* Validate the data
        if (!courseId || !rating || !review) {
            return res.status(400).json({
                status: 'fail',
                message: 'Fill all the fields'
            })
        }

        //* Check whether the user is enrolled or not
        const courseDetails = await courseModel.findOne({ _id: courseId, studentEnrolled: { $elemMatch: { $eq: userId } } });  // '$eq' -> equal operator

        if (!courseDetails) {
            return res.status(404).json({
                status: 'fail',
                message: 'Student is not enrolled in the course'
            })
        }
        //*Check whether the course is valid or exisiting or not
        const exisitingCourse = await courseModel.findById(courseId);
        if (!exisitingCourse) {
            return res.status(404).json({
                status: 'fail',
                message: 'Course not found'
            })
        }

        //* Check if the user is already reviewed the course or not
        const alreadyReviewed = await ratingAndReviewsModel.findOne({ user: userId, course: courseId })
        if (alreadyReviewed) {
            return res.status(403).json({
                status: 'success',
                message: 'Course is already reviewed'
            })
        }

        //* Create the entry in the db 
        const ratingData = await ratingAndReviewsModel.create({
            user: userId,
            course: courseId,
            rating: rating,
            review: review
        })

        //* Push this rating ID in the courseModel
        const updatedCourse = await courseModel.findByIdAndUpdate(courseId,
            { $push: { ratingAndReviews: ratingData._id } },
            { new: true }
        )
            .populate('ratingAndReviews')
            .exec();

        console.log("Updated Course: ", updatedCourse)
        //* Send Response
        res.status(201).json({
            status: 'success',
            rating: ratingData,
            message: 'Created a new rating with a review'
        })
    }
    catch (err) {
        res.status(500).json({
            status: 'fail',
            data: 'Failed to create a new rating',
            message: err.message
        })
    }
}

//* Update the ratingAndReview
exports.updateRatingAndReview = async (req, res) => {
    try {
        //* Get the ratingId to be updated 
        // const userId = req.user.id;
        const { ratingId, rating, review } = req.body;
        const exisitingRating = await ratingAndReviewsModel.findById(ratingId);

        //* Check if the rating exists or not
        if (!exisitingRating) {
            return res.status(404).json({
                status: 'fail',
                message: 'Rating & Review not found!'
            })
        }

        //* Update the rating 
        exisitingRating.rating = rating
        exisitingRating.review = review
        exisitingRating.save();
        //* Send Response
        res.status(201).send('Rating updated successfully!')
    }
    catch (err) {
        res.status(500).json({
            status: 'fail',
            data: 'Failed to update the rating and review',
            message: err.message
        })
    }
}

exports.getAverageRating = async (req, res) => {
    try {
        //* Get the course id
        const courseId = req.body.courseId;

        if (!courseId) {
            return res.status(400).send('Course Id is missing')
        }
        //* calculate average rating 
        //! SYNTAX -> Check the aggregate in mongoose or google or Chat GPT
        const result = await ratingAndReviewsModel.aggregate([
            //* The [] is important when we are using the aggregate and the $match matches all the courses based on courseId
            {
                $match: {
                    course: mongoose.Types.ObjectId(courseId)
                }
            },
            //* The matches courses are then grouped as we want to group all the matched docs togethter we can set _id to null and find the averageRating of the rating with $avg on $rating
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$rating" }
                }
            }
        ])
        //* Return rating
        if (result.length > 0) {
            return res.status(200).json({
                success: true,
                averageRating: result[0].averageRating
            })
        }

        //* If no rating exists
        return res.status(404).json({
            status: 'success',
            message: 'Average rating is 0, no ratings given till now'
        })
    }
    catch (err) {
        res.status(500).json({
            status: 'fail',
            data: 'Failed to get all the average ratings and reviews',
            message: err.message
        })
    }
}

//* Get the rating & Reviews based on single course id
exports.getRatingBasedonCourse = async (req, res) => {
    try {
        //* Get the courseId to fetch all the ratings 
        const courseId = req.body.courseId;

        //* Check whether the user exists or not
        const exisitingCourse = await courseModel.findOne({ _id: courseId })
            .populate({
                path: 'ratingAndReviews',
                select: '-__v',
                populate: {
                    path: 'user',
                    select: 'firstName lastName email'
                }
            })
            .exec();
        if (!exisitingCourse) {
            return res.status(404).json({
                status: 'fail',
                message: 'Course not found!'
            })
        }

        //* Get the Rating & Reviews array
        const ratingAndReviews = exisitingCourse.ratingAndReviews;

        //* Send response
        res.status(200).json({
            status: 'success',
            results: ratingAndReviews.length,
            ratingAndReviews
        })
    }
    catch (err) {
        res.status(500).json({
            status: 'fail',
            data: 'Failed to get all the ratings and reviews',
            message: err.message
        })
    }
}

//* Get all the ratings and reviews -> To show on the dashboard/main screen
exports.getAllRating = async (req, res) => {
    try {
        const ratings = await ratingAndReviewsModel.find()
            .populate({
                path: 'user',
                select: 'firstName lastName'
            })
            .exec()
            ;

        if (!ratings) {
            return res.status(404).send('No ratings found!')
        }

        res.status(200).json({
            status: 'success',
            results: ratings.length,
            ratings
        })
    }
    catch (err) {
        res.status(500).json({
            status: 'fail',
            data: 'Failed to fetch all the ratings and reviews',
            message: err.message
        })
    }
}

//* Deleting a particular rating & review
exports.deleteRatingAndReivew = async (req, res) => {
    try {
        //* Get the ratingId
        const { ratingId, courseId } = req.body;
        //* Check if the rating exists or not
        if (!ratingId || !courseId) {
            return res.status(404).json({
                status: 'fail',
                message: 'Fill all the fields'
            })
        }

        //* Delete the rating
        await ratingAndReviewsModel.findByIdAndDelete(ratingId);
        //* Update the courseModel rating section by removing the object Id of the ratingAndReviews array
        await courseModel.findByIdAndUpdate(
            courseId,
            { $pull: { ratingAndReviews: ratingId } },
            { new: true }
        )
        //* Send Response
        res.status(204).json({
            status: 'success',
            message: 'Deleted a rating successfully!'
        })
    }
    catch (err) {
        res.status(500).json({
            status: 'fail',
            data: 'Failed to delete the rating and review',
            message: err.message
        })
    }
}