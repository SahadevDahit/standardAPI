import express from "express";
import db from "../db/conn.mjs";
import generateToken from "../utils/generateToken.mjs";
import {
    ObjectId
} from "mongodb";
import bcrypt from "bcryptjs";
import {
    isLoggedIn
} from "../middlewares/isLoggedIn.mjs";
import {
    isAdmin
} from "../middlewares/isAdmin.mjs";
const router = express.Router();


//get user by id
router.get("/", isLoggedIn, async (req, res) => {
    try {

        let query = {
            _id: new ObjectId(req.userAuthId)
        };


        // Ensure the collection name is correct
        let collection = await db.collection("users");

        // Find the user
        let result = await collection.findOne(query);

        if (!result) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        // Convert result to an array
        result = [result];

        res.status(200).json(result);
    } catch (error) {
        console.error("Error in user route:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

//login user
router.post('/login', async (req, res) => {
    try {
        const collection = await db.collection("users");
        const {
            email,
            password
        } = req.body;

        // Find the user with the provided email
        const user = await collection.findOne({
            email
        });

        // Check if the user exists
        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Compare the provided password with the hashed password stored in the database
        const passwordMatch = await bcrypt.compare(password, user.password);

        // Check if the passwords match
        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Generate a token for the user
        const token = generateToken(user._id);

        // Convert the user object into an array
        const userArray = Object.values(user);

        // Return the token and user array
        res.status(200).json({
            token,
            user: userArray
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});


// register a user
router.post("/", async (req, res) => {
    try {
        const collection = await db.collection("users");

        // Check if the user with the provided email already exists
        const existingUser = await collection.findOne({
            email: req.body.email
        });
        if (existingUser) {
            return res.status(400).json({
                message: "User with this email already exists"
            });
        }

        const newDocument = req.body;
        const {
            email,
            password
        } = req.body;

        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10);
        newDocument.password = hashedPassword;

        newDocument.date = new Date();

        // Insert a new document only if the user with the provided email doesn't exist
        const result = await collection.insertOne(newDocument);

        res.json(newDocument).status(204); // Return the inserted user details without password
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

// update the user profile
router.put("/", isLoggedIn, async (req, res) => {
    try {
        const collection = await db.collection("users");

        // Get the user ID from the logged-in user
        const userId = new ObjectId(req.userAuthId);

        // Extract update data from req.body
        const {
            email,
            firstName,
            lastName,
            phoneNo,
            isAdmin,
            status
        } = req.body;

        // Create the update query
        const updateQuery = {
            $set: {
                email,
                firstName,
                lastName,
                phoneNo,
                isAdmin,
                status
            },
        };

        // Perform the update
        const result = await collection.updateOne({
            _id: userId
        }, updateQuery);

        if (result.modifiedCount === 0) {
            // No user was updated
            return res.status(404).json({
                message: "User not found or no changes applied"
            });
        }

        // Fetch and return the updated user
        const updatedUser = await collection.findOne({
            _id: userId
        });

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Error updating user profile:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});



// Delete user
router.delete("/", isLoggedIn, isAdmin, async (req, res) => {
    try {
        const query = {
            _id: ObjectId(req.userAuthId)
        };

        const collection = await db.collection("users");

        // Use try-catch to handle errors during deletion
        try {
            const result = await collection.deleteOne(query);

            if (result.deletedCount === 0) {
                // If no document was deleted, send a 404 response
                return res.status(404).json({
                    message: "User not found"
                });
            }

            // Document deleted successfully
            res.status(200).json({
                message: "User deleted successfully"
            });
        } catch (deleteError) {
            // Handle specific error cases if needed
            console.error("Error deleting user:", deleteError);
            res.status(500).json({
                message: "Error deleting user"
            });
        }
    } catch (error) {
        // Handle any errors that occur before reaching the deletion logic
        console.error("Error in delete route:", error);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

export default router;