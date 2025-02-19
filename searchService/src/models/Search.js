import mongoose from "mongoose";

const searchPostSchema = new mongoose.Schema(
  {
    postId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    content: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

searchPostSchema.index({ content: "text" });
searchPostSchema.index({ createdAt: -1 });

//MongoDB stores that field's values in a sorted data structure, making lookups much faster

const Search = mongoose.model("Search", searchPostSchema);

export { Search };
