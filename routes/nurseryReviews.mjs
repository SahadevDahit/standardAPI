import express from "express";
import db from "../db/conn.mjs";
import {
    ObjectId
} from "mongodb";
import {
    isLoggedIn
} from "../middlewares/isLoggedIn.mjs";
const router = express.Router();
// Add a new nursery review
router.post("/:nurseryId/reviews", isLoggedIn, async (req, res) => {
    try {
        const rating = req.body.rating;
        if (rating < 1 || rating > 5) {
            res.status(400).json({
                code: 1,
                message: "Rating should be between 1 and 5",
            });
            return;
        }

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

        const userAuthId = new ObjectId(req.userAuthId);

        const nurseryReview = {
            _id: new ObjectId(),
            user: userAuthId,
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
        }, updateQuery);

        // Fetch additional data for the user and product
        const user = await db.collection("users").findOne({
            _id: userAuthId,
        });

        const product = await db.collection("products").findOne({
            _id: existingNursery.product_id,
        });

        res.status(201).json({
            code: 1,
            message: "Review added successfully",
            data: {
                review: {
                    ...nurseryReview,
                    user,
                },
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