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
} from "../middlewares/isAdmin.mjs";
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
                            $avg: "$nurseryReviews.rating"
                        }, 2] // Calculate average rating and round to 2 decimal places
                    }
                }
            },
            {
                $limit: 50
            }
        ]).toArray();

        res.status(200).send(results);
    } catch (error) {
        console.error("Error fetching nurseries:", error);
        res.status(500).send({
            message: "Internal Server Error"
        });
    }
});

// Get a single nursery
router.get("/:id", async (req, res) => {
    try {
        const collection = await db.collection("nurseries");
        const query = {
            _id: new ObjectId(req.params.id)
        };
        const result = await collection.findOne(query);

        if (!result) {
            res.status(404).send({
                message: "Nursery not found"
            });
        } else {
            // Calculate average rating from nurseryReviews
            const nurseryReviews = result.nurseryReviews || [];
            const totalReviews = nurseryReviews.length;

            if (totalReviews > 0) {
                const totalRating = nurseryReviews.reduce((sum, review) => sum + review.rating, 0);
                const averageRating = totalRating / totalReviews;
                result.averageRating = averageRating.toFixed(2);
            } else {
                result.averageRating = 0;
            }

            res.status(200).send(result);
        }
    } catch (error) {
        console.error("Error fetching nursery:", error);
        res.status(500).send({
            message: "Internal Server Error"
        });
    }
});

// Add a new nursery
router.post("/", isLoggedIn, isAdmin, async (req, res) => {
    try {
        const collection = await db.collection("nurseries");
        const {
            name
        } = req.body;
        // Check if a nursery with the same name already exists
        const existingNursery = await collection.findOne({
            name
        });

        if (existingNursery) {
            return res.status(400).send({
                message: "Nursery with this name already exists"
            });
        }

        const newNursery = {
            ...req.body,
            user: new ObjectId(req.userAuthId),
            nurseryReviews: [], // Initialize as an empty array
        };

        const result = await collection.insertOne(newNursery);

        res.status(204).send(result);
    } catch (error) {
        console.error("Error creating nursery:", error);
        res.status(500).send({
            message: "Internal Server Error"
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
            nurseryReviews
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
            _id: nurseryId
        }, updateQuery);

        if (result.modifiedCount === 0) {
            return res.status(404).send({
                message: "Nursery not found or no changes applied"
            });
        }

        const updatedNursery = await collection.findOne({
            _id: nurseryId
        });
        res.status(200).send(updatedNursery);
    } catch (error) {
        console.error("Error updating nursery:", error);
        res.status(500).send({
            message: "Internal Server Error"
        });
    }
});


// Update nursery details
router.put("/:id", isLoggedIn, async (req, res) => {
    try {
        const collection = await db.collection("nurseries");
        const nurseryId = ObjectId(req.params.id);
        const {
            name,
            time,
            distance,
            address,
            nurseryReview,

        } = req.body;

        const updateQuery = {
            $set: {
                name,
                time,
                distance,
                address,
                nurseryReview,

            },
        };

        const result = await collection.updateOne({
            _id: nurseryId
        }, updateQuery);

        if (result.modifiedCount === 0) {
            return res.status(404).send({
                message: "Nursery not found or no changes applied"
            });
        }

        const updatedNursery = await collection.findOne({
            _id: nurseryId
        });
        res.status(200).send(updatedNursery);
    } catch (error) {
        console.error("Error updating nursery:", error);
        res.status(500).send({
            message: "Internal Server Error"
        });
    }
});

// Delete a nursery
router.delete("/:id", isLoggedIn, isAdmin, async (req, res) => {
    try {
        const collection = await db.collection("nurseries");
        const nurseryId = new ObjectId(req.params.id);
        const result = await collection.deleteOne({
            _id: nurseryId
        });

        if (result.deletedCount === 0) {
            return res.status(404).send({
                message: "Nursery not found"
            });
        }

        res.status(200).send({
            message: "Nursery deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting nursery:", error);
        res.status(500).send({
            message: "Internal Server Error"
        });
    }
});


// Add a review to a nursery
router.post("/:nurseryId/reviews", isLoggedIn, async (req, res) => {
    try {
        const collection = await db.collection("nurseries");
        const nurseryId = new ObjectId(req.params.nurseryId);

        // Check if the nursery exists
        const existingNursery = await collection.findOne({
            _id: nurseryId
        });
        if (!existingNursery) {
            return res.status(404).send({
                message: "Nursery not found"
            });
        }
        const nurseryReview = {
            _id: new ObjectId(),
            user: new ObjectId(req.userAuthId),
            rating: req.body.rating,
            comment: req.body.comment
        };
        // Update the existing nursery document to include the new review
        const updateQuery = {
            $push: {
                nurseryReviews: nurseryReview
            }
        };

        await collection.updateOne({
            _id: nurseryId
        }, updateQuery);



        res.status(204).send({
            message: "Review added successfully"
        });
    } catch (error) {
        console.error("Error adding nursery review:", error);
        res.status(500).send({
            message: "Internal Server Error"
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
            _id: nurseryId
        });
        if (!existingNursery) {
            return res.status(404).send({
                message: "Nursery not found"
            });
        }

        // Find the index of the review in the nurseryReviews array
        const reviewIndex = existingNursery.nurseryReviews.findIndex(review => review._id.equals(reviewId));

        // Check if the review exists in the nursery
        if (reviewIndex === -1) {
            return res.status(404).send({
                message: "Review not found in the nursery"
            });
        }

        // Remove the review from the nurseryReviews array
        existingNursery.nurseryReviews.splice(reviewIndex, 1);

        // Update the existing nursery document without the deleted review
        const updateQuery = {
            $set: {
                nurseryReviews: existingNursery.nurseryReviews
            }
        };

        await collection.updateOne({
            _id: nurseryId
        }, updateQuery);

        res.status(204).send({
            message: "Review deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting nursery review:", error);
        res.status(500).send({
            message: "Internal Server Error"
        });
    }
});

export default router;