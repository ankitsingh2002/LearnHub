const mongoose = require('mongoose');
require('dotenv').config();

exports.dbConnect = () => {
    mongoose.connect(process.env.DATABASE_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
        .then(() => console.log('DB Connected SUCCESSFULLY!'))
        .catch((err) => {
            console.log('FAILED TO CONNECT WITH DB');
            console.error(err.message);
            process.exit(1)
        })
} 