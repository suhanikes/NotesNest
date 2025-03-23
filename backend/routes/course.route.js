 import express from "express";
import multer from "multer";
import {
  createCourse,
  updateCourse,
  deleteCourse,
  getCourses,
  courseDetails,
  buyCourses,
  uploadCoursePDF,
  downloadPdf,
} from "../controllers/course.controller.js";
import userMiddleware from "../middlewares/user.mid.js";
import adminMiddleware from "../middlewares/admin.mid.js";

const router = express.Router();

// Multer storage configuration for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/pdfs/"); // Save PDFs in "uploads/pdfs" directory
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Unique file names
  },
});

const upload = multer({ storage });

// Course Routes
router.post("/create", adminMiddleware, createCourse);
router.put("/update/:courseId", adminMiddleware, updateCourse);
router.delete("/delete/:courseId", adminMiddleware, deleteCourse);
router.get("/courses", getCourses);
router.get("/:courseId", courseDetails);
router.post("/buy/:courseId", userMiddleware, buyCourses);


// PDF Upload & Download Routes
router.post("/upload-pdf/:courseId", adminMiddleware, upload.single("pdf"), uploadCoursePDF);
router.get("/download-pdf/:courseId", userMiddleware, downloadPdf);

export default router;
