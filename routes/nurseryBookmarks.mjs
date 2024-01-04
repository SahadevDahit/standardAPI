import express from "express";
import db from "../db/conn.mjs";
import {
    ObjectId
} from "mongodb";
import {
    isLoggedIn
} from "../middlewares/isLoggedIn.mjs";

const router = express.Router();
// GET endpoint to retrieve nursery bookmarks with populated nursery details
router.get("/", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);

        // Retrieve the user's nursery bookmarks
        const bookmarks = await db.collection("nursery_bookmarks").find({
            user: userId,
            type: "nursery"
        }).toArray();

        // Populate additional details from the "nurseries" collection
        const populatedBookmarks = await Promise.all(
            bookmarks.map(async (bookmark) => {
                const nursery = await db.collection("nurseries").findOne({
                    _id: bookmark.nursery_id
                });
                return {
                    ...bookmark,
                    nursery
                };
            })
        );

        res.status(200).json({
            bookmarks: populatedBookmarks
        });
    } catch (error) {
        console.error("Error retrieving nursery bookmarks:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});
router.post("/:nurseryId/bookmarks", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const nurseryId = new ObjectId(req.params.nurseryId);

        // Check if the nursery exists
        const nursery = await db.collection("nurseries").findOne({
            _id: nurseryId
        });

        if (!nursery) {
            return res.status(404).json({
                message: "Nursery not found"
            });
        }

        // Check if the user already bookmarked this nursery
        const existingBookmark = await db.collection("nursery_bookmarks").findOne({
            user: userId,
            nursery_id: nurseryId
        });

        if (existingBookmark) {
            return res.status(400).json({
                message: "Nursery already bookmarked"
            });
        }

        // Add the bookmark
        await db.collection("nursery_bookmarks").insertOne({
            user: userId,
            nursery_id: nurseryId,
            type: "nursery"
        });

        res.status(204).json({
            message: "Nursery bookmarked successfully"
        });
    } catch (error) {
        console.error("Error adding nursery bookmark:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});
router.delete("/:nurseryId/bookmarks", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const nurseryId = new ObjectId(req.params.nurseryId);

        // Check if the nursery exists
        const nursery = await db.collection("nurseries").findOne({
            _id: nurseryId
        });

        if (!nursery) {
            return res.status(404).json({
                message: "Nursery not found"
            });
        }

        // Remove the bookmark
        const result = await db.collection("nursery_bookmarks").deleteOne({
            user: userId,
            nursery_id: nurseryId,
            type: "nursery"
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: "Nursery bookmark not found"
            });
        }

        res.status(200).json({
            message: "Nursery bookmark removed successfully"
        });
    } catch (error) {
        console.error("Error removing nursery bookmark:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

export default router;