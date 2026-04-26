import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { upload } from "../middlewares/upload.js";

export const uploadRouter = Router();

uploadRouter.post("/", authenticate, upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      console.error("Upload failed: No file uploaded");
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }
    
    console.log("File uploaded successfully:", {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });
    
    const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3001}`;
    const url = `${baseUrl}/uploads/${req.file.filename}`;
    
    console.log("Generated file URL:", url);
    res.json({ success: true, url });
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
