import Testimoni from "../models/testimoni.models.js";
import {
  downloadAndUpload,
  isValidImageUrl,
  uploadToCloudinary,
} from "../utils/uploadToCloudinary.js";

export const getAllTestimoni = async (req, res) => {
  try {
    const testimonis = await Testimoni.find({}).sort({ createdAt: -1 });
    if (!testimonis)
      return res.status(404).json({ message: "Testimoni not found" });
    res.status(200).json({ testimonis });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createTestimoni = async (req, res) => {
  try {
    let { authorImage, description, ratting, status } = req.body;

    const author = req.body.author || "admin";

    if (!author || !description || !ratting)
      return res.status(400).json({ message: "All fields are required" });

    if (ratting < 1 || ratting > 5) {
      return res
        .status(400)
        .json({ message: "Ratting must be between 1 and 5" });
    }

    let imageUrl = authorImage;

    if (req.file) {
      const result = await uploadToCloudinary(
        req.file.buffer,
        req.file,
        "testimoniAuthorProfile"
      );
      imageUrl = result.url;
    } else if (authorImage && isValidImageUrl(authorImage)) {
      const result = await downloadAndUpload(
        authorImage,
        "testimoniAuthorProfile"
      );
      imageUrl = result.url;
    }

    const testimoni = await Testimoni.create({
      author,
      authorImage: imageUrl,
      description,
      ratting,
      status,
    });

    res.status(200).json({ testimoni });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateTestimoni = async (req, res) => {
  try {
    const { author, authorImage, description, ratting, status } = req.body;
    let updateData = {};
    if (author) updateData.author = author;
    if (description) updateData.description = description;
    if (ratting) updateData.ratting = ratting;
    if (status) updateData.status = status;

    if (req.file) {
      const result = await uploadToCloudinary(
        req.file.buffer,
        req.file,
        "testimoniAuthorProfile"
      );
      updateData.authorImage = result.url;
    } else if (authorImage && isValidImageUrl(authorImage)) {
      const result = await downloadAndUpload(
        authorImage,
        "testimoniAuthorProfile"
      );
      updateData.authorImage = result.url;
    }

    const updatedTestimoni = await Testimoni.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!updateData)
      return res.status(400).json({ message: "Testimoni not found" });
    res.status(200).json({ success: true, updatedTestimoni });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteTestimoni = async (req, res) => {
  try {
    const testimoni = await Testimoni.findByIdAndDelete(req.params.id);
    if (!testimoni)
      return res.status(404).json({ message: "Testimoni not found" });

    res.status(200).json({ message: "Testimoni deleted", success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
