import express from "express";
import db from "../db/conn.mjs";
import {
    ObjectId
} from "mongodb";
import {
    isLoggedIn
} from "../middlewares/isLoggedIn.mjs";


const router = express.Router();

// Get a list of 50 products with average ratings
router.get("/", async (req, res) => {
    try {
        const collection = await db.collection("products");

        const results = await collection.aggregate([{
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "userDetails",
                },
            },
            {
                $limit: 50,
            },
        ]).toArray();

        // Calculate average rating for each product
        const productsWithAverageRating = results?.map((product) => {
            const totalReviews = product.productReviews.length;
            if (totalReviews > 0) {
                const totalRating = product.productReviews.reduce((acc, review) => acc + review.rating, 0);
                const averageRating = totalRating / totalReviews;
                product.averageRating = averageRating.toFixed(2);
            } else {
                product.averageRating = 0;
            }
            return product;
        });

        res.status(200).json({
            code: 1,
            message: "Products with average ratings and user details retrieved successfully",
            data: {
                products: productsWithAverageRating,
            },
        });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});


// Get a single product with average rating
router.get("/:id", async (req, res) => {
    try {
        const collection = await db.collection("products");
        const productId = new ObjectId(req.params.id);

        const result = await collection.aggregate([{
                $match: {
                    _id: productId
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "userDetails"
                }
            }
        ]).next();

        if (!result) {
            res.status(404).json({
                code: -1,
                message: "Product not found",
            });
        } else {
            // Calculate the average rating from productReviews
            const totalReviews = result.productReviews.length;
            if (totalReviews > 0) {
                const totalRating = result.productReviews.reduce((acc, review) => acc + review.rating, 0);
                const averageRating = totalRating / totalReviews;
                result.averageRating = averageRating.toFixed(2);
            } else {
                result.averageRating = 0;
            }

            res.status(200).json({
                code: 1,
                message: "Product details with user details retrieved successfully",
                data: {
                    product: result,
                },
            });
        }
    } catch (error) {
        console.error("Error fetching product:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});


// Get a list of products by partial name match
router.get("/search/:partialName", async (req, res) => {
    try {
        const collection = await db.collection("products");
        const partialName = req.params.partialName;

        const products = await collection
            .find({
                name: {
                    $regex: new RegExp(partialName, "i"), // Case-insensitive partial match
                },
            })
            .toArray();

        res.status(200).json({
            code: 1,
            message: "products retrieved by partial name match successfully",
            data: {
                products,
            },
        });
    } catch (error) {
        console.error("Error fetching products by partial name:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// Add a new product
router.post("/", isLoggedIn, async (req, res) => {
    try {
        const type = req?.type;

        if (type !== 1) {
            res.status(500).json({
                code: -1,
                message: "Only Vendor is allowed",
            });
        }
        const collection = await db.collection("products");
        const {
            name,
            description,
            category_id,
            nursery_id,
            images,
            price,
            quantity
        } = req.body;

        // Check if the provided category_id exists
        const category = await db.collection("categories").findOne({
            _id: new ObjectId(category_id),
        });

        if (!category) {
            return res.status(404).json({
                code: -1,
                message: "Category not found",
            });
        }

        // Check if the provided nursery_id exists
        let nurseryIdObject = null;
        if (nursery_id) {
            const nursery = await db.collection("nurseries").findOne({
                _id: new ObjectId(nursery_id),
            });

            if (!nursery) {
                return res.status(404).json({
                    code: -1,
                    message: "Nursery not found",
                });
            }

            nurseryIdObject = new ObjectId(nursery_id);
        }

        const newproduct = {
            name,
            description,
            category_id: new ObjectId(category_id),
            nursery_id: nurseryIdObject,
            user: new ObjectId(req.userAuthId),
            images,
            price,
            quantity,
            productReviews: [], // Initialize as an empty array
        };

        const result = await collection.insertOne(newproduct);

        res.status(201).json({
            code: 1,
            message: "product added successfully",
            data: {
                _id: result.insertedId,
                ...newproduct,
            },
        });
    } catch (error) {
        console.error("Error creating product:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// Update product details
router.patch("/:id", isLoggedIn, async (req, res) => {
    try {
        const type = req?.type;

        if (type !== 1) {
            res.status(500).json({
                code: -1,
                message: "Only Vendor is allowed",
            });
        }
        const collection = await db.collection("products");
        const productId = new ObjectId(req.params.id);
        const {
            name,
            description,
            category_id,
            nursery_id,
            user,
            price,
            quantity
        } = req.body;

        // Check if the provided product name already exists
        if (name) {
            const existingproductWithName = await collection.findOne({
                name,
                _id: {
                    $ne: productId // Exclude the current product from the check
                }
            });

            if (existingproductWithName) {
                return res.status(400).json({
                    code: -1,
                    message: "product name already exists. Please choose a different name."
                });
            }
        }

        const updateQuery = {
            $set: {}
        };

        // Add only the fields that are provided in the request body
        if (name) updateQuery.$set.name = name;
        if (description) updateQuery.$set.description = description;
        if (category_id) updateQuery.$set.category_id = new ObjectId(category_id);
        if (nursery_id !== undefined) updateQuery.$set.nursery_id = nursery_id ? new ObjectId(nursery_id) : null;
        if (user) updateQuery.$set.user = new ObjectId(user);
        if (price !== undefined) updateQuery.$set.price = price;
        if (quantity !== undefined) updateQuery.$set.quantity = quantity;

        const result = await collection.updateOne({
                _id: productId,
            },
            updateQuery
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({
                code: -1,
                message: "product not found or no changes applied",
            });
        }

        const updatedproduct = await collection.findOne({
            _id: productId,
        });

        res.status(200).json({
            code: 1,
            message: "product details updated successfully",
            data: {
                product: updatedproduct,
            },
        });
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});


// Delete a product
router.delete("/:id", isLoggedIn, async (req, res) => {
    try {
        const type = req?.type;

        if (type !== 1) {
            res.status(500).json({
                code: -1,
                message: "Only Vendor is allowed",
            });
        }
        const collection = await db.collection("products");
        const productId = new ObjectId(req.params.id);
        const result = await collection.deleteOne({
            _id: productId,
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                code: -1,
                message: "product not found",
            });
        }

        res.status(200).json({
            code: 1,
            message: "product deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// Add a review to a product
router.post("/:productId/reviews", isLoggedIn, async (req, res) => {
    try {
        const collection = await db.collection("products");
        const productId = new ObjectId(req.params.productId);

        // Check if the product exists
        const existingproduct = await collection.findOne({
            _id: productId,
        });
        if (!existingproduct) {
            return res.status(404).json({
                code: -1,
                message: "product not found",
            });
        }

        const productReviews = {
            _id: new ObjectId(),
            user: new ObjectId(req.userAuthId),
            rating: req.body.rating,
            comment: req.body.comment,
        };

        // Update the existing product document to include the new review
        const updateQuery = {
            $push: {
                productReviews: productReviews,
            },
        };

        await collection.updateOne({
                _id: productId,
            },
            updateQuery
        );

        res.status(201).json({
            code: 1,
            message: "Review added successfully",
            data: {
                productReviews,
            },
        });
    } catch (error) {
        console.error("Error adding product review:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// Delete a product review
router.delete("/:productId/reviews/:reviewId", isLoggedIn, async (req, res) => {
    try {
        const collection = await db.collection("products");
        const productId = new ObjectId(req.params.productId);
        const reviewId = new ObjectId(req.params.reviewId);

        // Check if the product exists
        const product = await collection.findOne({
            _id: productId,
        });

        if (!product) {
            return res.status(404).json({
                code: -1,
                message: "product not found",
            });
        }

        // Check if the review exists in the product's reviews
        const reviewIndex = product.productReviews.findIndex((review) => review._id.equals(reviewId));

        if (reviewIndex === -1) {
            return res.status(404).json({
                code: -1,
                message: "product review not found",
            });
        }

        // Remove the review from the product's reviews array
        product.productReviews.splice(reviewIndex, 1);

        // Save the updated product document
        await collection.updateOne({
            _id: productId,
        }, {
            $set: {
                productReviews: product.productReviews,
            },
        });

        res.status(200).json({
            code: 1,
            message: "product review deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting product review:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

export default router;