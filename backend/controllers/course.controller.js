
import { Course } from "../models/course.model.js";
import { Purchase } from "../models/purchase.model.js";
import Stripe from "stripe";
import { v2 as cloudinary } from "cloudinary";
import config from "../config.js";

const stripe = new Stripe(config.STRIPE_SECRET_KEY);


export const createCourse = async (req, res) => {
  console.log("Cloudinary ENV Values:", {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET
  });
  console.log("Direct Cloudinary Config:", cloudinary.config());
  const adminId = req.adminId;
  const { title, description, price } = req.body;

  console.log("Request received:", req.body);
  console.log("Files received:", req.files);

  try {
    if (!title || !description || !price) {
      return res.status(400).json({ errors: "All fields are required" });
    }

    if (!req.files || !req.files.image || !req.files.pdf) {
      return res.status(400).json({ errors: "Image and PDF are required" });
    }

    const { image, pdf } = req.files;

    console.log("Image File:", image);
    console.log("PDF File:", pdf);

    // ✅ Validate image format
    const allowedImageFormats = ["image/png", "image/jpeg"];
    if (!allowedImageFormats.includes(image.mimetype)) {
      return res.status(400).json({ errors: "Invalid image format. Use PNG or JPG" });
    }

    // ✅ Validate PDF format
    if (pdf.mimetype !== "application/pdf") {
      return res.status(400).json({ errors: "Invalid file format. Only PDFs are allowed" });
    }

    // console.log("Cloudinary object:", cloudinary);
    console.log("Cloudinary Config:", {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET ? "Exists" : "Missing"
    });

    console.log("Cloudinary configured with:", cloudinary.config().cloud_name);
    

    // ✅ Upload Image to Cloudinary
    const imageResponse = await cloudinary.uploader.upload(image.tempFilePath);
    if (!imageResponse || imageResponse.error) {
      return res.status(500).json({ errors: "Error uploading image to Cloudinary" });
    }

    // ✅ Upload PDF to Cloudinary
    const pdfResponse = await cloudinary.uploader.upload(pdf.tempFilePath, {
      resource_type: "raw",
    });
    if (!pdfResponse || pdfResponse.error) {
      return res.status(500).json({ errors: "Error uploading PDF to Cloudinary" });
    }

    console.log("PdfResponseUrl",pdfResponse.url)
    // ✅ Create course entry
    const course = await Course.create({
      title,
      description,
      price,
      image: {
        public_id: imageResponse.public_id,
        url: imageResponse.url,
      },
      pdf: {
        public_id: pdfResponse.public_id,
        url: String(pdfResponse.url),
      },
      creatorId: adminId,
    });

    res.json({ message: "Course created successfully", course });
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ error: "Error creating course" });
  }
};

// ✅ Get Course Details (Includes PDF Link)
export const courseDetails = async (req, res) => {
  const { courseId } = req.params;
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.status(200).json({ course });
  } catch (error) {
    console.error("Error fetching course details:", error);
    res.status(500).json({ error: "Error fetching course details" });
  }
};

// ✅ Buy Course (Now Stores Purchase & Allows PDF Access)
// export const buyCourses = async (req, res) => {
//   const { userId } = req;
//   const { courseId } = req.params;

//   try {
//     const course = await Course.findById(courseId);
//     if (!course) {
//       return res.status(404).json({ errors: "Course not found" });
//     }

//     const existingPurchase = await Purchase.findOne({ userId, courseId });
//     if (existingPurchase) {
//       return res.status(400).json({ errors: "User has already purchased this course" });
//     }

//     // ✅ Stripe Payment Processing
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: course.price * 100, // Convert to cents
//       currency: "usd",
//       payment_method_types: ["card"],
//     });

//     // ✅ Store Purchase Record
//     await Purchase.create({ userId, courseId });

//     res.status(201).json({
//       message: "Course purchased successfully",
//       clientSecret: paymentIntent.client_secret,
//     });
//   } catch (error) {
//     console.error("Error in course buying:", error);
//     res.status(500).json({ error: "Error in course buying" });
//   }
// };
export const buyCourses = async (req, res) => {
  const { userId } = req;
  const { courseId } = req.params;

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ errors: "Course not found" });
    }

    const existingPurchase = await Purchase.findOne({ userId, courseId });
    if (existingPurchase) {
      return res.status(400).json({ errors: "User has already purchased this course" });
    }

    // ✅ Stripe Payment Processing
    const paymentIntent = await stripe.paymentIntents.create({
      amount: course.price * 100, // Convert to cents
      currency: "usd",
      payment_method_types: ["card"],
    });

    // ✅ Send only ONE response
    return res.status(201).json({
      message: "Payment initiated",
      clientSecret: paymentIntent.client_secret,
      course: {
        title: course.title,
        price: course.price,
      },
    });

  } catch (error) {
    console.error("Error in initiating payment:", error);
    
    // ✅ Avoid multiple responses in catch block
    if (!res.headersSent) {
      return res.status(500).json({ error: "Error in initiating payment" });
    }
  }
};

// ✅ Allow Users to Download PDF (Only If Purchased)
export const downloadPdf = async (req, res) => {
  const { userId } = req;
  const { courseId } = req.params;

  try {
    const purchase = await Purchase.findOne({ userId, courseId });
    if (!purchase) {
      return res.status(403).json({ errors: "You have not purchased this course" });
    }

    const course = await Course.findById(courseId);
    if (!course || !course.pdf?.url) {
      return res.status(404).json({ errors: "Course PDF not found" });
    }

    res.status(200).json({ pdfUrl: course.pdf.url });
  } catch (error) {
    console.error("Error fetching PDF:", error);
    res.status(500).json({ error: "Error fetching PDF" });
  }
};
export const deleteCourse = async (req, res) => {
    const adminId = req.adminId;
    const { courseId } = req.params;
    try {
      const course = await Course.findOneAndDelete({
        _id: courseId,
        creatorId: adminId,
      });
      if (!course) {
        return res
          .status(404)
          .json({ errors: "can't delete, created by other admin" });
      }
      res.status(200).json({ message: "Course deleted successfully" });
    } catch (error) {
      res.status(500).json({ errors: "Error in course deleting" });
      console.log("Error in course deleting", error);
    }
  };
  export const getCourses = async (req, res) => {
      try {
        const courses = await Course.find({});
        res.status(201).json({ courses });
      } catch (error) {
        res.status(500).json({ errors: "Error in getting courses" });
        console.log("error to get courses", error);
      }
    };
    // export const updateCourse = async (req, res) => {
    //     const adminId = req.adminId;
    //     const { courseId } = req.params;
    //     const { title, description, price, image } = req.body;
    //     try {
    //       const courseSearch = await Course.findById(courseId);
    //       if (!courseSearch) {
    //         return res.status(404).json({ errors: "Course not found" });
    //       }
    //       const course = await Course.findOneAndUpdate(
    //         {
    //           _id: courseId,
    //           creatorId: adminId,
    //         },
    //         {
    //           title,
    //           description,
    //           price,
    //           image: {
    //             public_id: image?.public_id,
    //             url: image?.url,
    //           },
    //         }
    //       );
    //       if (!course) {
    //         return res
    //           .status(404)
    //           .json({ errors: "can't update, created by other admin" });
    //       }
    //       res.status(201).json({ message: "Course updated successfully", course });
    //     } catch (error) {
    //       res.status(500).json({ errors: "Error in course updating" });
    //       console.log("Error in course updating ", error);
    //     }
    //   };
    export const updateCourse = async (req, res) => {
      const adminId = req.adminId;
      const { courseId } = req.params;
      const { title, description, price, image } = req.body;
    
      try {
        const course = await Course.findOne({ _id: courseId, creatorId: adminId });
        if (!course) {
          return res.status(404).json({ errors: "Course not found or not created by you" });
        }
    
        // Preserve the existing image if no new image is provided
        const updatedImage = image && image.public_id ? image : course.image;
    
        const updatedCourse = await Course.findByIdAndUpdate(
          courseId,
          {
            title,
            description,
            price,
            image: updatedImage,
          },
          { new: true }
        );
    
        res.status(200).json({ message: "Course updated successfully", updatedCourse });
      } catch (error) {
        console.error("Error in course updating ", error);
        res.status(500).json({ errors: "Error in course updating" });
      }
    };
    
      export const uploadCoursePDF = async (req, res) => {
        try {
          const adminId = req.adminId;
          const { courseId } = req.params;
      
          // ✅ Check if course exists
          let course = await Course.findById(courseId);
          if (!course) {
            return res.status(404).json({ error: "Course not found" });
          }
      
          // ✅ Ensure only the course creator (admin) can update
          if (course.creatorId.toString() !== adminId) {
            return res.status(403).json({ error: "You can only update your own courses" });
          }
      
          // ✅ Validate and Upload PDF
          if (!req.files || !req.files.pdf) {
            return res.status(400).json({ error: "PDF file is required" });
          }
      
          const { pdf } = req.files;
          if (pdf.mimetype !== "application/pdf") {
            return res.status(400).json({ error: "Invalid file format. Only PDFs are allowed" });
          }
      
          // ✅ Upload new PDF to Cloudinary
          const pdfResponse = await cloudinary.uploader.upload(pdf.tempFilePath, {
            resource_type: "auto",
          });
      
          if (!pdfResponse || !pdfResponse.url) {
            throw new Error("PDF upload failed");
          }
      
          // ✅ Update Course with New PDF URL
          console.log("PdfResponseUrl",pdfResponse.url)
          course.pdf = {
            public_id: pdfResponse.public_id,
            url: pdfResponse.url,
          };
      
          await course.save();
      
          res.status(200).json({ message: "PDF uploaded successfully", pdfUrl: pdfResponse.url });
        } catch (error) {
          console.error("Error uploading PDF:", error);
          res.status(500).json({ error: "Error uploading PDF" });
        }
      };
      