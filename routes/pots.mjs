import express from "express";
import db from "../db/conn.mjs";
import {
    ObjectId
} from "mongodb";
import {
    isLoggedIn
} from "../middlewares/isLoggedIn.mjs";

const router = express.Router();

// POST endpoint to create a new pot
router.post("/", isLoggedIn, async (req, res) => {
    try {
        const {
            plant_id,
            name,
            price
        } = req.body;

        // Check if the plant exists
        const plant = await db.collection("plants").findOne({
            _id: new ObjectId(plant_id)
        });

        if (!plant) {
            return res.status(404).json({
                message: "Plant not found"
            });
        }

        // Create a new pot
        const pot = {
            plant_id: new ObjectId(plant_id),
            name,
            price
        };

        // Save the pot to the database
        await db.collection("pots").insertOne(pot);

        res.status(201).json({
            message: "Pot created successfully",
            pot
        });
    } catch (error) {
        console.error("Error creating pot:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

// GET endpoint to retrieve pots for a specific plant
router.get("/", isLoggedIn, async (req, res) => {
    try {

        // Retrieve pots for the specific plant
        const pots = await db.collection("pots").find().toArray();

        res.status(200).json({
            pots
        });
    } catch (error) {
        console.error("Error retrieving pots:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

// GET endpoint to retrieve details of a specific pot
router.get("/:id", isLoggedIn, async (req, res) => {
    try {
        const json = new ObjectId(req.params.id);

        // Retrieve the pot details
        const pot = await db.collection("pots").findOne({
            _id: json
        });

        if (!pot) {
            return res.status(404).json({
                message: "Pot not found"
            });
        }

        res.status(200).json({
            pot
        });
    } catch (error) {
        console.error("Error retrieving pot details:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

// PUT endpoint to update the details of a specific pot
router.put("/:id", isLoggedIn, async (req, res) => {
    try {
        const id = new ObjectId(req.params.id);
        const {
            name,
            price
        } = req.body;

        // Update the details of the pot
        const result = await db.collection("pots").updateOne({
            _id: id
        }, {
            $set: {
                name,
                price
            }
        });

        if (result.matchedCount === 0) {
            return res.status(404).json({
                message: "Pot not found"
            });
        }

        res.status(200).json({
            message: "Pot details updated successfully",
            name,
            price
        });
    } catch (error) {
        console.error("Error updating pot details:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

// DELETE endpoint to remove a specific pot
router.delete("/:id", isLoggedIn, async (req, res) => {
    try {
        const id = new ObjectId(req.params.id);

        // Remove the pot
        const result = await db.collection("pots").deleteOne({
            _id: id
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: "Pot not found"
            });
        }

        res.status(200).json({
            message: "Pot removed successfully"
        });
    } catch (error) {
        console.error("Error removing pot:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

export default router;