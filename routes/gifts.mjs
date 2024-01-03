import express from "express";
import db from "../db/conn.mjs";
import {
    ObjectId
} from "mongodb";
import {
    isLoggedIn
} from "../middlewares/isLoggedIn.mjs";

const router = express.Router();

// POST endpoint to send a gift
router.post("/", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const {
            type,
            nursery_id,
            message
        } = req.body;

        // Check if the nursery exists
        const nursery = await db.collection("nurseries").findOne({
            _id: new ObjectId(nursery_id)
        });

        if (!nursery) {
            return res.status(404).end();
        }

        // Add the gift
        await db.collection("gifts").insertOne({
            user: userId,
            type,
            nursery_id: new ObjectId(nursery_id),
            message
        });

        res.status(201).end();
    } catch (error) {
        console.error("Error sending gift:", error);
        res.status(500).end();
    }
});

// GET endpoint to retrieve gifts with populated user and nursery details
router.get("/", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);

        // Retrieve gifts for the specific user type and nursery
        const gifts = await db.collection("gifts").find({
            user: userId,
        }).toArray();

        // Populate additional details from the "nurseries" and "users" collections
        const populatedGifts = await Promise.all(
            gifts.map(async (gift) => {
                const nursery = await db.collection("nurseries").findOne({
                    _id: gift.nursery_id
                });
                const user = await db.collection("users").findOne({
                    _id: gift.user
                });
                return {
                    ...gift,
                    nursery,
                    user
                };
            })
        );

        res.status(200).send(populatedGifts);
    } catch (error) {
        console.error("Error retrieving gifts:", error);
        res.status(500).end();
    }
});

// DELETE endpoint to remove a gift
router.delete("/:giftId", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const giftId = new ObjectId(req.params.giftId);

        // Check if the gift exists
        const gift = await db.collection("gifts").findOne({
            _id: giftId,
            user: userId
        });

        if (!gift) {
            return res.status(404).end();
        }

        // Remove the gift
        const result = await db.collection("gifts").deleteOne({
            _id: giftId,
            user: userId
        });

        if (result.deletedCount === 0) {
            return res.status(404).end();
        }

        res.status(200).end();
    } catch (error) {
        console.error("Error removing gift:", error);
        res.status(500).end();
    }
});

export default router;