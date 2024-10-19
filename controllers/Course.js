const Course = require("../models/Course")
const User = require("../models/User")
const Tag = require("../models/Category")
const { uploadImageToCloudinary } = require("../utils/imageUploader")

// create course handler function
exports.createCourse = async ( req,res ) => {
    try{

        // fetch data, Get all required fields from request body
        const {courseName, courseDeascription, price, tag, whatYouWillLearn} = req.body

        //get thumbnail, Get thumbnail image from request files
        const thumbnail = req.files.thumbnailImage;

        //validatrion, Check if any of the required fields are missing
        if (
            !courseName ||
            !courseDescription ||
            !whatYouWillLearn ||
            !price ||
            !tag.length ||
            !thumbnail ||
            !category ||
            !instructions.length
          ) {
            return res.status(400).json({
              success: false,
              message: "All Fields are Mandatory",
            })
          }

             // Check if the user is an instructor
            const instructorDetails = await User.findById(userId, {
            accountType: "Instructor",
             })
  
            if (!instructorDetails) {
            return res.status(404).json({
            success: false,
            message: "Instructor Details Not Found",
              })
            }

            // Check if the tag given is valid
            const categoryDetails = await Category.findById(category)
            if (!categoryDetails) {              // tag is 'id' and 'instructor' is "object_id"
              return res.status(404).json({
                success: false,
                message: "Category Details Not Found",
              })
            }

            // Upload the Thumbnail to Cloudinary
            const thumbnailImage = await uploadImageToCloudinary(
                thumbnail,
                process.env.FOLDER_NAME
                )
            console.log(thumbnailImage)

            // Create a new course with the given details
    const newCourse = await Course.create({
        courseName,
        courseDescription,
        instructor: instructorDetails._id,
        whatYouWillLearn: whatYouWillLearn,
        price,
        tag,
        category: categoryDetails._id,
        thumbnail: thumbnailImage.secure_url,
        instructions,
      })

      // Add the new course to the User Schema of the Instructor
    await User.findByIdAndUpdate(
        {
          _id: instructorDetails._id,
        },
        {
          $push: {
            courses: newCourse._id,
          },
        },
        { new: true }
      )

        // update the 'tag' ka schema

        // Return the new course and a success message
        res.status(200).json({
        success: true,
        data: newCourse,
        message: "Course Created Successfully",
        })
  }
            catch(error){

                // Handle any errors that occur during the creation of the course
        console.error(error)
        res.status(500).json({
        success: false,
        message: "Failed to create course",
        error: error.message,
        })
        
            }
};


// Get all courses handle function
exports.getAllCourses = async (req, res) => {
    try {

        const courses = await courseModel.find(
            {}
        )
            .populate({
                path: 'instructor',
            })
            .populate({
                path: "courseContent",
                populate: {
                    path: 'subSection'
                }
            })
            .exec()
        // validation
        if (!courses) {
            return res.status(404).json({
                status: 'fail',
                message: 'Course not found!'
            })
        }

        //* Return response 
        res.status(200).json({
            status: 'success',
            results: courses.length,
            courses
        })
    }
    catch (err) {
        res.status(500).json({
            status: 'fail',
            data: 'Failed to get all the courses',
            message: err.message,
        })
    }
}

// Get a single course handle function
exports.getCourseDetails = async (req, res) => {
    try {
        const courseId = req.body.courseId;

        if (!courseId) {
            return res.status(404).send("Course Id is missing!")
        }
        const course = await courseModel.findById(courseId)
            .populate({
                path: 'instructor',
                populate: {
                    path: 'additionalDetails'
                }
            })
            .populate('category')
            .populate('ratingAndReviews')
            .populate({
                path: 'courseContent',
                populate: {
                    path: 'subSection'
                }
            })
            .exec()

        if (!course) {
            return res.status(404).json({
                status: 'fail',
                message: 'Course not found!'
            })
        }

        //* Return response 
        res.status(200).json({
            status: 'success',
            course
        })
    }
    catch (err) {
        res.status(500).json({
            status: 'fail',
            data: 'Failed to get all the courses',
            message: err.message,
        })
    }
}