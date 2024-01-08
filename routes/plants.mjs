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

// Get a list of 50 plants with average ratings
router.get("/", async (req, res) => {
    try {
        const collection = await db.collection("plants");
        const results = await collection.find({}).limit(50).toArray();

        // Calculate average rating for each plant
        const plantsWithAverageRating = results.map((plant) => {
            const totalReviews = plant.plantReviews.length;
            if (totalReviews > 0) {
                const totalRating = plant.plantReviews.reduce((acc, review) => acc + review.rating, 0);
                const averageRating = totalRating / totalReviews;
                plant.averageRating = averageRating.toFixed(2);
            } else {
                plant.averageRating = 0;
            }
            return plant;
        });

        res.status(200).json({
            code: 1,
            message: "Plants with average ratings retrieved successfully",
            data: {
                plants: plantsWithAverageRating,
            },
        });
    } catch (error) {
        console.error("Error fetching plants:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// Get a single plant with average rating
router.get("/:id", async (req, res) => {
    try {
        const collection = await db.collection("plants");
        const query = {
            _id: new ObjectId(req.params.id)
        };
        const result = await collection.findOne(query);

        if (!result) {
            res.status(404).json({
                code: -1,
                message: "Plant not found",
            });
        } else {
            // Calculate the average rating from plantReviews
            const totalReviews = result.plantReviews.length;
            if (totalReviews > 0) {
                const totalRating = result.plantReviews.reduce((acc, review) => acc + review.rating, 0);
                const averageRating = totalRating / totalReviews;
                result.averageRating = averageRating.toFixed(2);
            } else {
                result.averageRating = 0;
            }

            res.status(200).json({
                code: 1,
                message: "Plant details retrieved successfully",
                data: {
                    plant: result,
                },
            });
        }
    } catch (error) {
        console.error("Error fetching plant:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// Get a list of plants by partial name match
router.get("/search/:partialName", async (req, res) => {
    try {
        const collection = await db.collection("plants");
        const partialName = req.params.partialName;

        const plants = await collection
            .find({
                name: {
                    $regex: new RegExp(partialName, "i"), // Case-insensitive partial match
                },
            })
            .toArray();

        res.status(200).json({
            code: 1,
            message: "Plants retrieved by partial name match successfully",
            data: {
                plants,
            },
        });
    } catch (error) {
        console.error("Error fetching plants by partial name:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// Add a new plant
router.post("/", isLoggedIn, isAdmin, async (req, res) => {
    try {
        const collection = await db.collection("plants");
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

        const newPlant = {
            name,
            description,
            category_id: new ObjectId(category_id),
            nursery_id: nurseryIdObject,
            user: new ObjectId(req.userAuthId),
            images,
            price,
            quantity,
            plantReviews: [], // Initialize as an empty array
        };

        const result = await collection.insertOne(newPlant);

        res.status(201).json({
            code: 1,
            message: "Plant added successfully",
            data: {
                _id: result.insertedId,
                ...newPlant,
            },
        });
    } catch (error) {
        console.error("Error creating plant:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// Update plant details
router.put("/:id", isLoggedIn, async (req, res) => {
    try {
        const collection = await db.collection("plants");
        const plantId = new ObjectId(req.params.id);
        const {
            name,
            description,
            category_id,
            nursery_id,
            user,
            price,
            quantity
        } = req.body;

        // Check if the provided plant name already exists
        const existingPlantWithName = await collection.findOne({
            name,
            _id: {
                $ne: plantId // Exclude the current plant from the check
            }
        });

        if (existingPlantWithName) {
            return res.status(400).json({
                code: -1,
                message: "Plant name already exists. Please choose a different name."
            });
        }

        const updateQuery = {
            $set: {
                name,
                description,
                category_id: new ObjectId(category_id),
                nursery_id: nursery_id ? new ObjectId(nursery_id) : null,
                user: new ObjectId(user),
                price,
                quantity,
            },
        };

        const result = await collection.updateOne({
                _id: plantId,
            },
            updateQuery
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({
                code: -1,
                message: "Plant not found or no changes applied",
            });
        }

        const updatedPlant = await collection.findOne({
            _id: plantId,
        });
        res.status(200).json({
            code: 1,
            message: "Plant details updated successfully",
            data: {
                plant: updatedPlant,
            },
        });
    } catch (error) {
        console.error("Error updating plant:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// Delete a plant
router.delete("/:id", isLoggedIn, isAdmin, async (req, res) => {
    try {
        const collection = await db.collection("plants");
        const plantId = new ObjectId(req.params.id);
        const result = await collection.deleteOne({
            _id: plantId,
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                code: -1,
                message: "Plant not found",
            });
        }

        res.status(200).json({
            code: 1,
            message: "Plant deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting plant:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// Add a review to a plant
router.post("/:plantId/reviews", isLoggedIn, async (req, res) => {
    try {
        const collection = await db.collection("plants");
        const plantId = new ObjectId(req.params.plantId);

        // Check if the plant exists
        const existingPlant = await collection.findOne({
            _id: plantId,
        });
        if (!existingPlant) {
            return res.status(404).json({
                code: -1,
                message: "Plant not found",
            });
        }

        const plantReviews = {
            _id: new ObjectId(),
            user: new ObjectId(req.userAuthId),
            rating: req.body.rating,
            comment: req.body.comment,
        };

        // Update the existing plant document to include the new review
        const updateQuery = {
            $push: {
                plantReviews: plantReviews,
            },
        };

        await collection.updateOne({
                _id: plantId,
            },
            updateQuery
        );

        res.status(201).json({
            code: 1,
            message: "Review added successfully",
            data: {
                plantReviews,
            },
        });
    } catch (error) {
        console.error("Error adding plant review:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// Delete a plant review
router.delete("/:plantId/reviews/:reviewId", isLoggedIn, async (req, res) => {
    try {
        const collection = await db.collection("plants");
        const plantId = new ObjectId(req.params.plantId);
        const reviewId = new ObjectId(req.params.reviewId);

        // Check if the plant exists
        const plant = await collection.findOne({
            _id: plantId,
        });

        if (!plant) {
            return res.status(404).json({
                code: -1,
                message: "Plant not found",
            });
        }

        // Check if the review exists in the plant's reviews
        const reviewIndex = plant.plantReviews.findIndex((review) => review._id.equals(reviewId));

        if (reviewIndex === -1) {
            return res.status(404).json({
                code: -1,
                message: "Plant review not found",
            });
        }

        // Remove the review from the plant's reviews array
        plant.plantReviews.splice(reviewIndex, 1);

        // Save the updated plant document
        await collection.updateOne({
            _id: plantId,
        }, {
            $set: {
                plantReviews: plant.plantReviews,
            },
        });

        res.status(200).json({
            code: 1,
            message: "Plant review deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting plant review:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

export default router;