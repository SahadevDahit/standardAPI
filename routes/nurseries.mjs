import express from "express";
import db from "../db/conn.mjs";
import {
    ObjectId
} from "mongodb";
import {
    isLoggedIn
} from "../middlewares/isLoggedIn.mjs";
import {
    isAdmin
} from "../middlewares/isAdmin.mjs";;

const router = express.Router();

// Get a list of 50 nurseries with average rating
router.get("/", async (req, res) => {
    try {
        const collection = await db.collection("nurseries");
        const results = await collection.aggregate([{
                $project: {
                    _id: 1,
                    name: 1,
                    time: 1,
                    distance: 1,
                    address: 1,
                    nurseryReviews: 1,
                    averageRating: {
                        $round: [{
                                $avg: "$nurseryReviews.rating",
                            },
                            2, // Calculate average rating and round to 2 decimal places
                        ],
                    },
                },
            },
            {
                $limit: 50,
            },
        ]).toArray();

        res.status(200).json({
            code: 1,
            message: "Nurseries fetched successfully",
            data: results,
        });
    } catch (error) {
        console.error("Error fetching nurseries:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// Get a single nursery
router.get("/:id", async (req, res) => {
    try {
        const collection = await db.collection("nurseries");
        const query = {
            _id: new ObjectId(req.params.id),
        };
        const result = await collection.findOne(query);

        if (!result) {
            res.status(404).json({
                code: -1,
                message: "Nursery not found",
            });
        } else {
            // Calculate average rating from nurseryReviews
            const nurseryReviews = result.nurseryReviews || [];
            const totalReviews = nurseryReviews.length;

            if (totalReviews > 0) {
                const totalRating = nurseryReviews.reduce(
                    (sum, review) => sum + review.rating,
                    0
                );
                const averageRating = totalRating / totalReviews;
                result.averageRating = averageRating.toFixed(2);
            } else {
                result.averageRating = 0;
            }

            res.status(200).json({
                code: 1,
                message: "Nursery fetched successfully",
                data: result,
            });
        }
    } catch (error) {
        console.error("Error fetching nursery:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// Get a single nursery by partial name with populated details
router.get("/search/:partialName", async (req, res) => {
    try {
        const collection = await db.collection("nurseries");
        const partialName = req.params.partialName;

        const nursery = await collection.findOne({
            name: {
                $regex: new RegExp(partialName, "i"), // Case-insensitive partial match
            },
        });

        if (!nursery) {
            res.status(404).json({
                code: -1,
                message: "Nursery not found",
            });
        } else {
            // Calculate average rating from nurseryReviews
            const nurseryReviews = nursery.nurseryReviews || [];
            const totalReviews = nurseryReviews.length;

            if (totalReviews > 0) {
                const totalRating = nurseryReviews.reduce(
                    (sum, review) => sum + review.rating,
                    0
                );
                const averageRating = totalRating / totalReviews;
                nursery.averageRating = averageRating.toFixed(2);
            } else {
                nursery.averageRating = 0;
            }

            res.status(200).json({
                code: 1,
                message: "Nursery fetched successfully",
                data: nursery,
            });
        }
    } catch (error) {
        console.error("Error fetching nursery:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// Add a new nursery
router.post("/", isLoggedIn, isAdmin, async (req, res) => {
    try {
        const collection = await db.collection("nurseries");
        const {
            name,
            time,
            distance,
            address
        } = req.body;
        // Check if a nursery with the same name already exists
        const existingNursery = await collection.findOne({
            name,
        });

        if (existingNursery) {
            return res.status(400).json({
                code: 0,
                message: "Nursery with this name already exists",
            });
        }

        const newNursery = {
            ...req.body,
            user: new ObjectId(req.userAuthId),
            nurseryReviews: [], // Initialize as an empty array
        };
        await collection.insertOne(newNursery);
        res.status(201).json({
            code: 1,
            message: "Nursery created successfully",
            data: newNursery,
        });
    } catch (error) {
        console.error("Error creating nursery:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// Update nursery details
router.put("/:id", async (req, res) => {
    try {
        const collection = await db.collection("nurseries");
        const nurseryId = new ObjectId(req.params.id);
        const {
            name,
            time,
            distance,
            address,
            nurseryReviews,
        } = req.body;

        const updateQuery = {
            $set: {
                name,
                time,
                distance,
                address,
                nurseryReviews, // Assuming nurseryReviews is an array
            },
        };

        const result = await collection.updateOne({
                _id: nurseryId,
            },
            updateQuery
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({
                code: -1,
                message: "Nursery not found or no changes applied",
            });
        }

        const updatedNursery = await collection.findOne({
            _id: nurseryId,
        });
        res.status(200).json({
            code: 1,
            message: "Nursery updated successfully",
            data: updatedNursery,
        });
    } catch (error) {
        console.error("Error updating nursery:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// Delete a nursery
router.delete("/:id", isLoggedIn, isAdmin, async (req, res) => {
    try {
        const collection = await db.collection("nurseries");
        const nurseryId = new ObjectId(req.params.id);
        const result = await collection.deleteOne({
            _id: nurseryId,
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                code: -1,
                message: "Nursery not found",
            });
        }

        res.status(200).json({
            code: 1,
            message: "Nursery deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting nursery:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// Add a new nursery review
router.post("/:nurseryId/reviews", isLoggedIn, async (req, res) => {
    try {
        const collection = await db.collection("nurseries");
        const nurseryId = new ObjectId(req.params.nurseryId);

        // Check if the nursery exists
        const existingNursery = await collection.findOne({
            _id: nurseryId,
        });

        if (!existingNursery) {
            return res.status(404).json({
                code: -1,
                message: "Nursery not found",
            });
        }

        // Ensure that nurseryReviews is an array or initialize it as an empty array
        if (!existingNursery.nurseryReviews) {
            existingNursery.nurseryReviews = [];
        }

        const nurseryReview = {
            _id: new ObjectId(),
            user: new ObjectId(req.userAuthId),
            rating: req.body.rating,
            comment: req.body.comment,
        };

        // Update the existing nursery document to include the new review
        const updateQuery = {
            $push: {
                nurseryReviews: nurseryReview,
            },
        };

        await collection.updateOne({
                _id: nurseryId,
            },
            updateQuery
        );

        res.status(201).json({
            code: 1,
            message: "Review added successfully",
            data: {
                review: nurseryReview
            },
        });
    } catch (error) {
        console.error("Error adding nursery review:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// Delete a review from a nursery
router.delete("/:nurseryId/reviews/:reviewId", isLoggedIn, async (req, res) => {
    try {
        const collection = await db.collection("nurseries");
        const nurseryId = new ObjectId(req.params.nurseryId);
        const reviewId = new ObjectId(req.params.reviewId);

        // Check if the nursery exists
        const existingNursery = await collection.findOne({
            _id: nurseryId,
        });
        if (!existingNursery) {
            return res.status(404).json({
                code: -1,
                message: "Nursery not found",
            });
        }

        // Find the index of the review in the nurseryReviews array
        const reviewIndex = existingNursery.nurseryReviews.findIndex((review) =>
            review._id.equals(reviewId)
        );

        // Check if the review exists in the nursery
        if (reviewIndex === -1) {
            return res.status(404).json({
                code: -1,
                message: "Review not found in the nursery",
            });
        }

        // Remove the review from the nurseryReviews array
        existingNursery.nurseryReviews.splice(reviewIndex, 1);

        // Update the existing nursery document without the deleted review
        const updateQuery = {
            $set: {
                nurseryReviews: existingNursery.nurseryReviews,
            },
        };

        await collection.updateOne({
                _id: nurseryId,
            },
            updateQuery
        );

        res.status(200).json({
            code: 1,
            message: "Review deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting nursery review:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

export default router;