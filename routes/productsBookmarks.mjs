import express from "express";
import db from "../db/conn.mjs";
import {
    ObjectId
} from "mongodb";
import {
    isLoggedIn
} from "../middlewares/isLoggedIn.mjs";

const router = express.Router();

// Function to populate product details
const populateProductDetails = async (productId) => {
    const product = await db.collection("products").findOne({
        _id: productId
    });
    return product;
};

// POST endpoint to create a bookmark for a product
router.post("/:productId/bookmarks", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const productId = new ObjectId(req.params.productId);

        // Check if the product exists
        const product = await populateProductDetails(productId);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        // Check if the user already bookmarked this product
        const existingBookmark = await db.collection("productsBookmarks").findOne({
            user: userId,
            product_id: productId,
            type: "product"
        });

        if (existingBookmark) {
            return res.status(400).json({
                message: "Product already bookmarked"
            });
        }

        // Add the bookmark
        const result = await db.collection("productsBookmarks").insertOne({
            user: userId,
            product_id: productId,
            type: "product"
        });

        res.status(201).json({
            message: "Product bookmarked successfully",
            data: {
                _id: result.insertedId,
                productId,
                product // Include product details in the response
            }
        });
    } catch (error) {
        console.error("Error adding product bookmark:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

// DELETE endpoint to remove a bookmark for a product
router.delete("/:productId/bookmarks", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);
        const productId = new ObjectId(req.params.productId);

        // Check if the product exists
        const product = await populateProductDetails(productId);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        // Remove the bookmark
        const result = await db.collection("productsBookmarks").deleteOne({
            user: userId,
            product_id: productId,
            type: "product"
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: "Product bookmark not found"
            });
        }

        res.status(200).json({
            message: "Product bookmark removed successfully"
        });
    } catch (error) {
        console.error("Error removing product bookmark:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

// GET endpoint to retrieve all bookmarks for products
router.get("/", isLoggedIn, async (req, res) => {
    try {
        const userId = new ObjectId(req.userAuthId);

        // Retrieve the user's product bookmarks
        const bookmarks = await db.collection("productsBookmarks").find({
            user: userId,
            type: "product"
        }).toArray();

        // Populate additional details from the "products" collection
        const populatedBookmarks = await Promise.all(
            bookmarks.map(async (bookmark) => {
                const product = await populateProductDetails(bookmark.product_id);
                return {
                    ...bookmark,
                    product
                };
            })
        );

        res.status(200).json({
            bookmarks: populatedBookmarks
        });
    } catch (error) {
        console.error("Error retrieving product bookmarks:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

// GET endpoint to search for products based on the name of the plant
router.get("/search/:partialName", async (req, res) => {
    try {
        const partialName = req.params.partialName;

        // Search for products by name
        const products = await db.collection("products").find({
            name: {
                $regex: new RegExp(partialName, "i")
            }
        }).toArray();

        res.status(200).json({
            code: 1,
            message: "Products retrieved by partial name match successfully",
            data: {
                products,
            },
        });
    } catch (error) {
        console.error("Error fetching products by partial name:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

export default router;