const express = require("express")
const router = express.Router()
const {contactUs}=require("../controllers/ContactUs.js");




router.post("/contactUs", contactUs);

module.exports = router;

