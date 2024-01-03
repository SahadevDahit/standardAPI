import express from "express";
import db from "../db/conn.mjs";
import {
    ObjectId
} from "mongodb";
import {
    isLoggedIn
} from "../middlewares/isLoggedIn.mjs";

const router = express.Router();

// POST endpoint to create a bookmark for a plant
router.post("/:plantId/bookmarks", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const plantId = new ObjectId(req.params.plantId);

        // Check if the plant exists
        const plant = await db.collection("plants").findOne({
            _id: plantId
        });

        if (!plant) {
            return res.status(404).send({
                message: "Plant not found"
            });
        }

        // Check if the user already bookmarked this plant
        const existingBookmark = await db.collection("plantsBookmarks").findOne({
            user: userId,
            plant_id: plantId,
            type: "plant"
        });

        if (existingBookmark) {
            return res.status(400).send({
                message: "Plant already bookmarked"
            });
        }

        // Add the bookmark
        await db.collection("plantsBookmarks").insertOne({
            user: userId,
            plant_id: plantId,
            type: "plant"
        });

        res.status(204).send({
            message: "Plant bookmarked successfully"
        });
    } catch (error) {
        console.error("Error adding plant bookmark:", error);
        res.status(500).send({
            message: "Internal Server Error"
        });
    }
});

// DELETE endpoint to remove a bookmark for a plant
router.delete("/:plantId/bookmarks", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const plantId = new ObjectId(req.params.plantId);

        // Check if the plant exists
        const plant = await db.collection("plants").findOne({
            _id: plantId
        });

        if (!plant) {
            return res.status(404).send({
                message: "Plant not found"
            });
        }

        // Remove the bookmark
        const result = await db.collection("plantsBookmarks").deleteOne({
            user: userId,
            plant_id: plantId,
            type: "plant"
        });

        if (result.deletedCount === 0) {
            return res.status(404).send({
                message: "Plant bookmark not found"
            });
        }

        res.status(200).send({
            message: "Plant bookmark removed successfully"
        });
    } catch (error) {
        console.error("Error removing plant bookmark:", error);
        res.status(500).send({
            message: "Internal Server Error"
        });
    }
});

// GET endpoint to retrieve all bookmarks for plants
router.get("/", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);

        // Retrieve the user's plant bookmarks
        const bookmarks = await db.collection("plantsBookmarks").find({
            user: userId,
            type: "plant"
        }).toArray();

        // Populate additional details from the "plants" collection
        const populatedBookmarks = await Promise.all(
            bookmarks.map(async (bookmark) => {
                const plant = await db.collection("plants").findOne({
                    _id: bookmark.plant_id
                });
                return {
                    ...bookmark,
                    plant
                };
            })
        );

        res.status(200).send({
            bookmarks: populatedBookmarks
        });
    } catch (error) {
        console.error("Error retrieving plant bookmarks:", error);
        res.status(500).send({
            message: "Internal Server Error"
        });
    }
});
export default router;