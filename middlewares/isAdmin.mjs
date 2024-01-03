import db from "../db/conn.mjs";
import {
    ObjectId
} from "mongodb";

export const isAdmin = async (req, res, next) => {
    try {
        const collection = await db.collection("users");
        // Find the user with the provided userAuthId
        const user = await collection.findOne({
            _id: new ObjectId(req.userAuthId)
        });

        // Check if the user exists and has isAdmin property
        if (user && user.isAdmin) {
            next();
        } else {
            throw new Error("Access denied, admin only");
        }
    } catch (error) {
        console.error("Error in isAdmin middleware:", error);
        next(new Error("Access denied, admin only")); // You can customize the error message if needed
    }
};