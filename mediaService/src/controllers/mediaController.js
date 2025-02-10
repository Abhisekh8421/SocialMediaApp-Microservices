import { Media } from "../models/Media.js";
import { uploadMediaToCloudinary } from "../utils/cloudinary.js";
import { logger } from "../utils/logger.js";

const uploadMedia = async (req, res) => {
  logger.info("Starting media upload");

  try {
    if (!req.file) {
      logger.error("No file found... please add a file and try again!!!");
      return res.status(400).json({
        success: false,
        message: "No file found... please add a file and try again!!!",
      });
    }

    const { mimetype, originalname } = req.file;
    const userId = req.user.userId;

    logger.info(`File details: Name: ${originalname}, Type: ${mimetype}`);
    logger.info("Uploading to Cloudinary...");

    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);

    logger.info(
      `Cloudinary Upload Successful. Public ID: ${cloudinaryUploadResult.public_id}`
    );

    const newlyCreatedMedia = new Media({
      publicId: cloudinaryUploadResult.public_id,
      mimeType: mimetype,
      originalName: originalname,
      url: cloudinaryUploadResult.secure_url,
      userId,
    });

    await newlyCreatedMedia.save();

    logger.info("Media successfully saved in the database.");

    res.status(201).json({
      success: true,
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
      message: "Media upload is successful",
    });
  } catch (error) {
    logger.error(`Error Uploading file: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Error uploading file",
    });
  }
};

export { uploadMedia };
