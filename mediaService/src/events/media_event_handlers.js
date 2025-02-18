import { Media } from "../models/Media.js";
import { deleteMediaFromCloudinary } from "../utils/cloudinary.js";
import { logger } from "../utils/logger.js";

const handlePostDeleted = async (event) => {
  console.log(event, " event");
  const { postId, mediaIds, userId } = event;
  try {
    const mediaToDelete = await Media.find({ _id: { $in: mediaIds } });
    for (const media of mediaToDelete) {
      await deleteMediaFromCloudinary(media.publicId);
      await Media.findByIdAndDelete(media._id);
      logger.info(
        `Deleted Media ${media._id} associated with this deleted post ${postId} `
      );
    }
    logger.info(`Processed deletion of media for post id ${postId}`);
  } catch (error) {}
};

export { handlePostDeleted };
