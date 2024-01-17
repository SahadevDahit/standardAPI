import express from "express";
import db from "../db/conn.mjs";
import {
    ObjectId
} from "mongodb";
import {
    isLoggedIn
} from "../middlewares/isLoggedIn.mjs";

const router = express.Router();

// POST endpoint to add a product to the user's shopping cart
router.post("/", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const {
            product_id,
            address,
            quantity
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

        // Add the product to the user's shopping cart
        const result = await db.collection("carts").insertOne({
            user: userId,
            product_id: new ObjectId(product_id),
            address,
            quantity,
        });
        res.status(201).json({
            code: 1,
            message: "product added to the cart successfully",
            data: {
                _id: result.insertedId,
                ...req.body
            },
        });
    } catch (error) {
        console.error("Error adding product to cart:", error);
        res.status(500).json({
            code: 0,
            message: "Error adding product to cart",
        });
    }
});

// GET endpoint to retrieve the user's shopping cart with populated product details
router.get("/", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);

        // Aggregate pipeline to join carts and products collections
        const pipeline = [{
                $match: {
                    user: userId
                },
            },
            {
                $lookup: {
                    from: "products",
                    localField: "product_id",
                    foreignField: "_id",
                    as: "productDetails",
                },
            },
            {
                $unwind: "$productDetails",
            },
            {
                $project: {
                    _id: 1,
                    address: 1,
                    quantity: 1,
                    product: "$productDetails", // Include the product details
                },
            },
        ];

        // Execute the aggregation pipeline
        const cartItems = await db.collection("carts").aggregate(pipeline).toArray();

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

// GET endpoint to retrieve a specific cart by cartId with populated product details
router.get("/:cartId", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const cartId = new ObjectId(req.params.cartId);

        // Aggregate pipeline to join carts and products collections
        const pipeline = [{
                $match: {
                    _id: cartId,
                    user: userId
                },
            },
            {
                $lookup: {
                    from: "products",
                    localField: "product_id",
                    foreignField: "_id",
                    as: "productDetails",
                },
            },
            {
                $unwind: "$productDetails",
            },
            {
                $project: {
                    _id: 1,
                    address: 1,
                    quantity: 1,
                    product_id: "$productDetails", // Include the product details
                },
            },
        ];

        // Execute the aggregation pipeline
        const cartItem = await db.collection("carts").aggregate(pipeline).next();

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

// PATCH endpoint to update a product in the user's shopping cart
router.patch("/:cartId", isLoggedIn, async (req, res) => {
    try {
        const cartId = new ObjectId(req.params.cartId);
        const {
            address,
            quantity
        } = req.body;

        // Create the update query
        const updateQuery = {};

        // Add only the fields that are provided in the request body
        if (address !== undefined) updateQuery.address = address;
        if (quantity !== undefined) updateQuery.quantity = quantity;

        // Update the product in the user's shopping cart
        const result = await db.collection("carts").updateOne({
            _id: cartId,
        }, {
            $set: updateQuery,
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



// DELETE endpoint to remove a product from the user's shopping cart
router.delete("/:cartId", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const cartId = new ObjectId(req.params.cartId);

        // Remove the product from the user's shopping cart
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
        console.error("Error removing product from cart:", error);
        res.status(500).json({
            code: 0,
            message: "Error removing product from cart",
        });
    }
});

// POST endpoint to move a cart item to productsBookmarks
router.post("/:cartId/move-to-bookmarks", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const cartId = new ObjectId(req.params.cartId);

        // Retrieve the cart item
        const cartItem = await db.collection("carts").findOne({
            _id: cartId,
            user: userId,
        });

        if (!cartItem) {
            return res.status(404).json({
                code: -1,
                message: "Cart item not found",
            });
        }

        // Check if the product is already bookmarked
        const existingBookmark = await db.collection("productsBookmarks").findOne({
            user: userId,
            product_id: cartItem.product_id,
            type: "product"
        });

        if (existingBookmark) {
            return res.status(400).json({
                code: -1,
                message: "Product already bookmarked",
            });
        }

        // Add the bookmark in productsBookmarks
        const result = await db.collection("productsBookmarks").insertOne({
            user: userId,
            product_id: cartItem.product_id,
            type: "product"
        });

        // Remove the cart item from the user's shopping cart
        await db.collection("carts").deleteOne({
            _id: cartId,
            user: userId,
        });

        res.status(200).json({
            code: 1,
            message: "Cart item moved to bookmarks successfully",
            data: {
                bookmarkId: result.insertedId,
                product_id: cartItem.product_id,
            },
        });
    } catch (error) {
        console.error("Error moving cart item to bookmarks:", error);
        res.status(500).json({
            code: 0,
            message: "Error moving cart item to bookmarks",
        });
    }
});

export default router;