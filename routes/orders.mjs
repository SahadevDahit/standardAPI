import express from "express";
import db from "../db/conn.mjs";
import {
    ObjectId
} from "mongodb";
import {
    isLoggedIn
} from "../middlewares/isLoggedIn.mjs";

const router = express.Router();

// POST endpoint to create a new order
router.post("/", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const {
            plant_id,
            status,
            quantity,
            paymentMethod,
            currency
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

        // Create a new order
        const randomTxt = Math.random().toString(36).substring(7).toLocaleUpperCase();
        const randomNumbers = Math.floor(1000 + Math.random() * 90000) + Date.now().toString();
        const orderNumber = randomTxt + randomNumbers;

        const order = {
            orderNumber,
            user: userId,
            plant_id: new ObjectId(plant_id),
            status,
            quantity,
            paymentMethod,
            currency,
            date: new Date(),
        };

        // Save the order to the database
        await db.collection("orders").insertOne(order);

        res.status(201).json({
            message: "Order created successfully",
            order
        });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

// GET endpoint to retrieve orders for a specific user
router.get("/", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);

        // Retrieve orders for the specific user
        const orders = await db.collection("orders").find({
            user: userId
        }).toArray();

        res.status(200).json({
            orders
        });
    } catch (error) {
        console.error("Error retrieving orders:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

// GET endpoint to retrieve details of a specific order
router.get("/:orderId", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const orderId = new ObjectId(req.params.orderId);

        // Retrieve the order details
        const order = await db.collection("orders").findOne({
            _id: orderId,
            user: userId
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        res.status(200).json({
            order
        });
    } catch (error) {
        console.error("Error retrieving order details:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

// PUT endpoint to update the status of a specific order
router.put("/:orderId", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const orderId = new ObjectId(req.params.orderId);
        const {
            status
        } = req.body;

        // Update the status of the order
        const result = await db.collection("orders").updateOne({
            _id: orderId,
            user: userId
        }, {
            $set: {
                status
            }
        });

        if (result.matchedCount === 0) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        res.status(200).json({
            message: "Order status updated successfully"
        });
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

// DELETE endpoint to cancel a specific order
router.delete("/:orderId", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const orderId = new ObjectId(req.params.orderId);

        // Remove the order
        const result = await db.collection("orders").deleteOne({
            _id: orderId,
            user: userId
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        res.status(200).json({
            message: "Order canceled successfully"
        });
    } catch (error) {
        console.error("Error canceling order:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

export default router;