const express = require('express')
const router = express.Router()
const profileController = require('../controllers/ProfileController')
const dotenv = require('dotenv').config()

const aws = require('aws-sdk');
const multer  = require('multer')
const multerS3 = require('multer-s3');

const path = require('path')

// const storage = multer.diskStorage({
//   destination: 'uploads/users/',
//   filename: (req, file, cb) => {
//     const extension = path.extname(file.originalname);
//     const filename = 'user-' + Date.now() + extension;
//     cb(null, filename);
//   }
// });

///////////////////////
const spacesEndpoint = new aws.Endpoint(process.env.DO_ENDPOINT); // Change to your region
aws.config.update({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.DO_ACCESS_KEY,
  secretAccessKey: process.env.DO_SECRET_KEY
});

const s3 = new aws.S3();

const storage = multerS3({
  s3: s3,
  bucket: process.env.DO_BUCKET_NAME,
  acl: 'public-read',
  key: function (req, file, cb)  {
    const extension = path.extname(file.originalname);
    const filename = 'user-' + Date.now() + extension;
    cb(null, filename);
  }
});

/////////////////////////

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpeg', '.jpg', '.png', '.JPG', '.PNG'];

  const extension = path.extname(file.originalname);
  const isValidExtension = allowedExtensions.includes(extension);

  if (isValidExtension) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file. Please upload a JPEG, JPG, or PNG file (2MB or less).'), false);
  }
}

const upload = multer({ storage,fileFilter: fileFilter })

router.get('/:id',profileController.profile_detail)
router.patch('/:id',upload.single('file'),profileController.profile_update)


module.exports = router 