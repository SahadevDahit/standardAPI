import express from "express";
import db from "../db/conn.mjs";
import {
    ObjectId
} from "mongodb";
import {
    isLoggedIn
} from "../middlewares/isLoggedIn.mjs";


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
// Get featured nurseries with a rating more than 4 (select top 5)
router.get("/featured/all", async (req, res) => {
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
                            2,
                        ],
                    },
                },
            },
            {
                $match: {
                    averageRating: {
                        $gt: 4
                    },
                },
            },
            {
                $sort: {
                    averageRating: -1,
                },
            },
            {
                $limit: 5,
            },
        ]).toArray();

        res.status(200).json({
            code: 1,
            message: "Featured nurseries fetched successfully",
            data: results,
        });
    } catch (error) {
        console.error("Error fetching featured nurseries:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

//search nearby nursuries
router.get("/nearby/featured/all", async (req, res) => {
    try {
        const collection = await db.collection("nurseries");

        // Modify the query to filter nurseries with distance less than 2 miles
        const query = {
            distance: {
                $regex: /^(\d+(\.\d+)?) miles?$/, // Match the distance format (e.g., "1.5 miles")
                $lt: "2", // Use $lt (less than) operator
            },
        };

        const result = await collection.find(query).toArray();

        res.status(200).json({
            code: 1,
            message: "Nearby nurseries fetched successfully",
            data: result,
        });
    } catch (error) {
        console.error("Error fetching nearby nurseries:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});


// Add a new nursery
router.post("/", isLoggedIn, async (req, res) => {
    try {
        const type = req?.type;

        if (type !== 1) {
            res.status(500).json({
                code: -1,
                message: "Only Vendor is allowed",
            });
        }
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
router.patch("/:id", isLoggedIn, async (req, res) => {
    try {
        const type = req?.type;

        if (type !== 1) {
            res.status(500).json({
                code: -1,
                message: "Only Vendor is allowed",
            });
        }
        const collection = await db.collection("nurseries");
        const nurseryId = new ObjectId(req.params.id);
        const {
            name,
            time,
            distance,
            address,
        } = req.body;

        const updatedNursery = await collection.findOne({
            _id: nurseryId,
        });
        const updateQuery = {
            $set: {}
        };

        // Add only the fields that are provided in the request body
        if (name) updateQuery.$set.name = name;
        if (time) updateQuery.$set.time = time;
        if (distance) updateQuery.$set.distance = distance;
        if (address) updateQuery.$set.address = address;

        const result = await collection.updateOne({
                _id: nurseryId,
            },
            updateQuery
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({
                code: -1,
                message: "Nursery  found but no changes applied",
            });
        }


        return res.status(200).json({
            code: 1,
            message: "Nursery details updated successfully",
            data: updatedNursery,
        });
    } catch (error) {
        console.error("Error updating nursery:", error);
        return res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// Delete a nursery
router.delete("/:id", isLoggedIn, async (req, res) => {
    try {
        const type = req?.type;

        if (type !== 1) {
            res.status(500).json({
                code: -1,
                message: "Only Vendor is allowed",
            });
        }
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



export default router;