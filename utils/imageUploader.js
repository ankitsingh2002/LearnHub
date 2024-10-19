const Cloudinary = require("cloudinary");

exports.uploadImageToCloudinary = async ( file, folder, quality, height)  => {

    const options = {folder};
    if(height) {
        options.height = height;
    }
    if(quality) {
        options.quality = quality;
    }
    options.resource_type = "auto";
    
    return await Cloudinary.UploadStream.upload(file.tempFilePath, options);

}