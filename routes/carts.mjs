import express from "express";
import db from "../db/conn.mjs";
import {
    ObjectId
} from "mongodb";
import {
    isLoggedIn
} from "../middlewares/isLoggedIn.mjs";

const router = express.Router();

// POST endpoint to add a plant to the user's shopping cart
router.post("/", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const {
            plant_id,
            address,
            quantity
        } = req.body;

        // Check if the plant exists
        const plant = await db.collection("plants").findOne({
            _id: new ObjectId(plant_id),
        });

        if (!plant) {
            return res.status(404).json({
                code: -1,
                message: "Plant not found",
            });
        }

        // Add the plant to the user's shopping cart
        const result = await db.collection("carts").insertOne({
            user: userId,
            plant_id: new ObjectId(plant_id),
            address,
            quantity,
        });
        res.status(201).json({
            code: 1,
            message: "Plant added to the cart successfully",
            data: {
                _id: result.insertedId,
                ...req.body
            },
        });
    } catch (error) {
        console.error("Error adding plant to cart:", error);
        res.status(500).json({
            code: 0,
            message: "Error adding plant to cart",
        });
    }
});

// GET endpoint to retrieve the user's shopping cart with populated plant details
router.get("/", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);

        // Retrieve the user's shopping cart
        const cartItems = await db.collection("carts").find({
            user: userId,
        }).toArray();

        res.status(200).json({
            code: 1,
            message: "Successfully retrieved shopping cart",
            data: cartItems,
        });
    } catch (error) {
        console.error("Error retrieving shopping cart:", error);
        res.status(500).json({
            code: 0,
            message: "Error retrieving shopping cart",
        });
    }
});

// GET endpoint to retrieve a specific cart by cartId
router.get("/:cartId", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const cartId = new ObjectId(req.params.cartId);

        // Retrieve the specific cart
        const cartItem = await db.collection("carts").findOne({
            _id: cartId,
            user: userId,
        });

        if (!cartItem) {
            return res.status(404).json({
                code: -1,
                message: "Cart not found",
            });
        }

        res.status(200).json({
            code: 1,
            message: "Successfully retrieved cart by cartId",
            data: cartItem,
        });
    } catch (error) {
        console.error("Error retrieving cart by cartId:", error);
        res.status(500).json({
            code: 0,
            message: "Error retrieving cart by cartId",
        });
    }
});

// PUT endpoint to update a plant in the user's shopping cart
router.put("/:cartId", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const cartId = new ObjectId(req.params.cartId);
        const {
            address,
            quantity
        } = req.body;

        // Update the plant in the user's shopping cart
        const result = await db.collection("carts").updateOne({
            _id: cartId,
            user: userId,
        }, {
            $set: {
                address,
                quantity,
            },
        });

        if (result.matchedCount === 0) {
            return res.status(404).json({
                code: -1,
                message: "Cart item not found",
            });
        }

        res.status(200).json({
            code: 1,
            message: "Successfully updated shopping cart item",
            data: {
                address,
                quantity,
                userId,
                cartId,
            },
        });
    } catch (error) {
        console.error("Error updating shopping cart item:", error);
        res.status(500).json({
            code: 0,
            message: "Error updating cart item",
        });
    }
});

// DELETE endpoint to remove a plant from the user's shopping cart
router.delete("/:cartId", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const cartId = new ObjectId(req.params.cartId);

        // Remove the plant from the user's shopping cart
        const result = await db.collection("carts").deleteOne({
            _id: cartId,
            user: userId,
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                code: -1,
                message: "Cart item not found",
            });
        }

        res.status(200).json({
            code: 1,
            message: "Successfully deleted cart item",
        });
    } catch (error) {
        console.error("Error removing plant from cart:", error);
        res.status(500).json({
            code: 0,
            message: "Error removing plant from cart",
        });
    }
});

export default router;