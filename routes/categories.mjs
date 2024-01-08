import express from "express";
import db from "../db/conn.mjs";
import {
    ObjectId
} from "mongodb";
import {
    isLoggedIn
} from "../middlewares/isLoggedIn.mjs";

const router = express.Router();

// Get a list of 20 categories
router.get("/", async (req, res) => {
    try {
        const collection = await db.collection("categories");
        const results = await collection.find({}).limit(20).toArray();

        res.status(200).json({
            code: 1,
            message: "Categories fetched successfully",
            data: results,
        });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({
            code: 0,
            message: "Internal Server Error",
        });
    }
});

// Get a single category
router.get("/:id", async (req, res) => {
    try {
        const collection = await db.collection("categories");
        const query = {
            _id: new ObjectId(req.params.id),
        };
        const result = await collection.findOne(query);

        if (!result) {
            res.status(404).json({
                code: -1,
                message: "Category not found",
            });
        } else {
            res.status(200).json({
                code: 1,
                message: "Category fetched successfully",
                data: result,
            });
        }
    } catch (error) {
        console.error("Error fetching category:", error);
        res.status(500).json({
            code: 0,
            message: "Error fetching category",
        });
    }
});

// Add a new category
router.post("/", isLoggedIn, async (req, res) => {
    try {
        const collection = db.collection("categories");
        const {
            name
        } = req.body;

        // Check if a category with the same name already exists
        const existingCategory = await collection.findOne({
            name
        });

        if (existingCategory) {
            return res.status(400).json({
                code: -1,
                message: "Category already exists",
            });
        }

        const newCategory = {
            ...req.body,
            user: new ObjectId(req.userAuthId),
            date: new Date(),
        };

        const result = await collection.insertOne(newCategory);

        res.status(200).json({
            code: 1,
            message: "Category created successfully",
            data: {
                _id: result.insertedId,
                ...newCategory
            },
        });
    } catch (error) {
        console.error("Error creating category:", error);
        res.status(500).json({
            code: 0,
            message: "Error creating category",
        });
    }
});

// Update category details
router.put("/:id", async (req, res) => {
    try {
        const collection = await db.collection("categories");
        const categoryId = new ObjectId(req.params.id);
        const {
            name,
            description /* other fields you want to update */
        } = req.body;

        // Check if a category with the same name already exists
        const existingCategory = await collection.findOne({
            name,
            _id: {
                $ne: categoryId
            }, // Exclude the current category from the check
        });

        if (existingCategory) {
            return res.status(400).json({
                code: -1,
                message: "Category with this name already exists",
            });
        }

        const updateQuery = {
            $set: {
                name,
                description,
                // Add other fields here
            },
        };

        const result = await collection.updateOne({
            _id: categoryId
        }, updateQuery);

        if (result.modifiedCount === 0) {
            return res.status(404).json({
                code: -1,
                message: "Category not found or no changes applied",
            });
        }

        const updatedCategory = await collection.findOne({
            _id: categoryId
        });
        res.status(200).json({
            code: 1,
            message: "Category updated successfully",
            data: updatedCategory,
        });
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({
            code: 0,
            message: "Error updating category",
        });
    }
});


// Delete a category
router.delete("/:id", isLoggedIn, async (req, res) => {
    try {
        const collection = await db.collection("categories");
        const categoryId = new ObjectId(req.params.id);
        const result = await collection.deleteOne({
            _id: categoryId
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                code: -1,
                message: "Category not found",
            });
        }

        res.status(200).json({
            code: 1,
            message: "Category deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({
            code: 0,
            message: "Error deleting category",
        });
    }
});

export default router;