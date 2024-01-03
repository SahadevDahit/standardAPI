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
        const results = await collection.find({})
            .limit(20)
            .toArray();

        res.status(200).json(results);
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

// Get a single category
router.get("/:id", async (req, res) => {
    try {
        const collection = await db.collection("categories");
        const query = {
            _id: new ObjectId(req.params.id)
        };
        const result = await collection.findOne(query);

        if (!result) {
            res.status(404).json({
                message: "Category not found"
            });
        } else {
            res.status(200).json(result);
        }
    } catch (error) {
        console.error("Error fetching category:", error);
        res.status(500).end();
    }
});

// Add a new category
router.post("/", isLoggedIn, async (req, res) => {
    try {
        const collection = await db.collection("categories");
        const {
            name
        } = req.body;

        // Check if a category with the same name already exists
        const existingCategory = await collection.findOne({
            name
        });

        if (existingCategory) {
            return res.status(400).end();
        }

        const newCategory = {
            ...req.body,
            user: new ObjectId(req.userAuthId),
            date: new Date(),
        };

        const result = await collection.insertOne(newCategory);

        res.status(204).json(result);
    } catch (error) {
        console.error("Error creating category:", error);
        res.status(500).end();
    }
});


// Update category details
router.put("/:id", async (req, res) => {
    try {
        const collection = await db.collection("categories");
        const categoryId = new ObjectId(req.params.id);
        const {
            name,
            description,
            /* other fields you want to update */
        } = req.body;

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
            return res.status(404).end();
        }

        const updatedCategory = await collection.findOne({
            _id: categoryId
        });
        res.status(200).json(updatedCategory);
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).end();
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
            return res.status(404).end();
        }

        res.status(200).end();
    } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).end();
    }
});

export default router;