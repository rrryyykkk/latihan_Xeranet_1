import LogoPT from "../models/logoPT.models.js";
import {
  downloadAndUpload,
  isValidImageUrl,
  uploadToCloudinary,
} from "../utils/uploadToCloudinary.js";

export const getAllLogoPT = async (req, res) => {
  try {
    const logos = await LogoPT.find({}).sort({ createdAt: -1 });
    res.status(200).json({ logos });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createLogoPT = async (req, res) => {
  try {
    let { logoPTImage, title, status } = req.body;
    console.log("📥 req.body:", req.body);

    if ((!req.files || req.files.length === 0) && !logoPTImage)
      return res.status(400).json({ message: "Image is required" });
    if (!title) return res.status(400).json({ message: "Title is required" });

    let imageUrl;

    if (req.files && req.files.length > 0) {
      const result = await uploadToCloudinary(
        req.files[0].buffer,
        req.files[0],
        "logoPT"
      );
      imageUrl = result.url;
    } else if (isValidImageUrl(logoPTImage)) {
      const result = await downloadAndUpload(logoPTImage, "logoPT");
      imageUrl = result.url;
    } else {
      return res.status(400).json({ message: "Invalid image source" });
    }

    console.log("✅ Cloudinary Upload Success:", imageUrl);

    const newLogoPT = await LogoPT.create({
      logoPTImage: imageUrl,
      title,
      status,
    });
    console.log("✅ MongoDB Save Success:", newLogoPT._id);

    return res.status(201).json({ success: true, newLogoPT });
  } catch (error) {
    console.error("❌ Error in createLogoPT:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

export const updateLogoPT = async (req, res) => {
  try {
    const { title, status, logoPTImage } = req.body;
    let updateData = {};
    if (title) updateData.title = title;
    if (status) updateData.status = status;

    if (req.files) {
      const result = await uploadToCloudinary(
        req.files[0].buffer,
        req.files[0],
        "logoPT"
      );
      updateData.logoPTImage = result.url;
    } else if (logoPTImage && isValidImageUrl(logoPTImage)) {
      const result = await downloadAndUpload(logoPTImage, "logoPT");
      updateData.logoPTImage = result.url;
    }

    const updatedLogoPT = await LogoPT.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!updateData)
      return res.status(400).json({ message: "logoPT not found" });
    res.status(200).json({ success: true, updatedLogoPT });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteLogoPT = async (req, res) => {
  try {
    const logoPT = await LogoPT.findByIdAndDelete(req.params.id);
    if (!logoPT) return res.status(404).json({ message: "logoPT not found" });

    res.status(200).json({ message: "logoPT deleted", success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
