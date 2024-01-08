import express from "express";
import db from "../db/conn.mjs";
import {
    ObjectId
} from "mongodb";
import {
    isLoggedIn
} from "../middlewares/isLoggedIn.mjs";

const router = express.Router();

// POST endpoint to create a new saved address
router.post("/", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const {
            receiver_name,
            receiver_contact,
            streetAddress,
            apartment,
            city,
            country,
            zipcode
        } = req.body;

        // Create a new saved address
        const savedAddress = {
            user: userId,
            receiver_name,
            receiver_contact,
            streetAddress,
            apartment,
            city,
            country,
            zipcode
        };

        // Save the address to the database
        const result = await db.collection("savedAddresses").insertOne(savedAddress);

        res.status(201).json({
            code: 1,
            message: "Saved address created successfully",
            data: {
                _id: result.insertedId,
                ...savedAddress
            }
        });
    } catch (error) {
        console.error("Error creating saved address:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error"
        });
    }
});

// GET endpoint to retrieve saved addresses for a specific user
router.get("/", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);

        // Retrieve saved addresses for the specific user
        const savedAddresses = await db.collection("savedAddresses").find({
            user: userId
        }).toArray();

        res.status(200).json({
            code: 1,
            message: "Saved addresses retrieved successfully",
            data: {
                savedAddresses
            }
        });
    } catch (error) {
        console.error("Error retrieving saved addresses:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error"
        });
    }
});

// GET endpoint to retrieve details of a specific saved address
router.get("/:addressId", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const addressId = new ObjectId(req.params.addressId);

        // Retrieve the saved address details
        const savedAddress = await db.collection("savedAddresses").findOne({
            _id: addressId,
            user: userId
        });

        if (!savedAddress) {
            return res.status(404).json({
                code: -1,
                message: "Saved address not found"
            });
        }

        res.status(200).json({
            code: 1,
            message: "Saved address details retrieved successfully",
            data: {
                savedAddress
            }
        });
    } catch (error) {
        console.error("Error retrieving saved address details:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error"
        });
    }
});

// PUT endpoint to update the details of a specific saved address
router.put("/:addressId", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const addressId = new ObjectId(req.params.addressId);
        const {
            receiver_name,
            receiver_contact,
            streetAddress,
            apartment,
            city,
            country,
            zipcode
        } = req.body;

        // Update the details of the saved address
        const result = await db.collection("savedAddresses").updateOne({
            _id: addressId,
            user: userId
        }, {
            $set: {
                receiver_name,
                receiver_contact,
                streetAddress,
                apartment,
                city,
                country,
                zipcode
            }
        });

        if (result.matchedCount === 0) {
            return res.status(404).json({
                code: -1,
                message: "Saved address not found"
            });
        }

        res.status(200).json({
            code: 1,
            message: "Saved address details updated successfully",
            data: {
                savedAddress: req.body
            }
        });
    } catch (error) {
        console.error("Error updating saved address details:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error"
        });
    }
});

// DELETE endpoint to remove a specific saved address
router.delete("/:addressId", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const addressId = new ObjectId(req.params.addressId);

        // Remove the saved address
        const result = await db.collection("savedAddresses").deleteOne({
            _id: addressId,
            user: userId
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                code: -1,
                message: "Saved address not found"
            });
        }

        res.status(200).json({
            code: 1,
            message: "Saved address removed successfully"
        });
    } catch (error) {
        console.error("Error removing saved address:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error"
        });
    }
});

export default router;