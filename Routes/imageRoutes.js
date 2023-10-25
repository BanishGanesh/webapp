const imageController = require("../controller/ImageController");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const fs = require('fs');
// const dir = './uploads';

// if (!fs.existsSync(dir)) {
//   fs.mkdirSync(dir);
// }

// Configure Multer to store files with a unique name
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = './uploads';
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
      },
  filename: function (req, file, cb) {
    const uniqueId = uuidv4();
    const currentDate = new Date().toISOString();
    const fileName = `${uniqueId}${currentDate}${file.originalname}`;
    cb(null, fileName);
  },
});

const upload = multer({ storage: storage });

const router = require("express").Router();

router.post("/:productId/image", upload.single("image"), imageController.addImage);

router.get("/:productId/image", imageController.getAllImages);

router.get("/:productId/image/:imageId", imageController.getImage);

router.delete("/:productId/image/:imageId", imageController.deleteImage);


module.exports = router;