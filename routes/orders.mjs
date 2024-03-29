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
            product_id,
            status,
            quantity,
            paymentMethod,
            currency
        } = req.body;

        // Check if the product exists
        const product = await db.collection("products").findOne({
            _id: new ObjectId(product_id),
        });

        if (!product) {
            return res.status(404).json({
                code: -1,
                message: "product not found",
            });
        }

        // Create a new order
        const randomTxt = Math.random().toString(36).substring(7).toLocaleUpperCase();
        const randomNumbers =
            Math.floor(1000 + Math.random() * 90000) + Date.now().toString();
        const orderNumber = randomTxt + randomNumbers;

        const order = {
            orderNumber,
            user: userId,
            product_id: new ObjectId(product_id),
            status,
            quantity,
            paymentMethod,
            currency,
            date: new Date(),
        };

        // Save the order to the database
        const result = await db.collection("orders").insertOne(order);

        res.status(201).json({
            code: 1,
            message: "Order created successfully",
            data: {
                _id: result.insertedId,
                ...order,
            },
        });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// GET endpoint to retrieve orders for a specific user
router.get("/", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);

        // Retrieve orders for the specific user
        const orders = await db.collection("orders")
            .find({
                user: userId,
            })
            .toArray();

        res.status(200).json({
            code: 1,
            message: "Orders retrieved successfully",
            data: {
                orders,
            },
        });
    } catch (error) {
        console.error("Error retrieving orders:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
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
            user: userId,
        });

        if (!order) {
            return res.status(404).json({
                code: -1,
                message: "Order not found",
            });
        }

        res.status(200).json({
            code: 1,
            message: "Order details retrieved successfully",
            data: {
                order,
            },
        });
    } catch (error) {
        console.error("Error retrieving order details:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// PATCH endpoint to update the status of a specific order
router.patch("/:orderId", isLoggedIn, async (req, res) => {
    try {
        const orderId = new ObjectId(req.params.orderId);
        const {
            status,
            quantity,
            paymentMethod,
            currency
        } = req.body;

        // Create the update query
        const updateQuery = {};

        // Add only the fields that are provided in the request body
        if (status !== undefined) updateQuery.status = status;
        if (quantity !== undefined) updateQuery.quantity = quantity;
        if (paymentMethod !== undefined) updateQuery.paymentMethod = paymentMethod;
        if (currency !== undefined) updateQuery.currency = currency;

        // Update the order details
        const result = await db.collection("orders").updateOne({
            _id: orderId,
        }, {
            $set: updateQuery,
        });

        if (result.matchedCount === 0) {
            return res.status(404).json({
                code: -1,
                message: "Order found but no changes made",
            });
        }

        res.status(200).json({
            code: 1,
            message: "Order details updated successfully",
            data: {
                order: updateQuery,
            },
        });
    } catch (error) {
        console.error("Error updating order details:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
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
            user: userId,
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                code: -1,
                message: "Order not found",
            });
        }

        res.status(200).json({
            code: 1,
            message: "Order canceled successfully",
        });
    } catch (error) {
        console.error("Error canceling order:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

export default router;