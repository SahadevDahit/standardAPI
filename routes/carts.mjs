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
            _id: new ObjectId(plant_id)
        });

        if (!plant) {
            return res.status(404).end();
        }

        // Add the plant to the user's shopping cart
        await db.collection("carts").insertOne({
            user: userId,
            plant_id: new ObjectId(plant_id),
            address,
            quantity
        });

        res.status(201).end();
    } catch (error) {
        console.error("Error adding plant to cart:", error);
        res.status(500).end();
    }
});

// GET endpoint to retrieve the user's shopping cart with populated plant details
router.get("/", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);

        // Retrieve the user's shopping cart
        const cartItems = await db.collection("carts").find({
            user: userId
        }).toArray();

        // Populate additional details from the "plants" collection
        const populatedCartItems = await Promise.all(
            cartItems.map(async (cartItem) => {
                const plant = await db.collection("plants").findOne({
                    _id: cartItem.plant_id
                });
                return {
                    ...cartItem,
                    plant
                };
            })
        );

        // Extract plants into a separate array
        const plants = populatedCartItems.map(cartItem => cartItem.plant);

        res.status(200).json(plants);
    } catch (error) {
        console.error("Error retrieving shopping cart:", error);
        res.status(500).end();
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
            user: userId
        }, {
            $set: {
                address,
                quantity
            }
        });

        if (result.matchedCount === 0) {
            return res.status(404).end();
        }

        res.status(200).end();
    } catch (error) {
        console.error("Error updating shopping cart item:", error);
        res.status(500).end();
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
            user: userId
        });

        if (result.deletedCount === 0) {
            return res.status(404).end();
        }

        res.status(200).end();
    } catch (error) {
        console.error("Error removing plant from cart:", error);
        res.status(500).end();
    }
});

export default router;