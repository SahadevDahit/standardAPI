import {
    MongoClient
} from "mongodb";

const connectionString = process.env.ATLAS_URI;
const client = new MongoClient(connectionString);

let conn;
try {
    conn = await client.connect();
    console.log("mongodb connected");
} catch (error) {
    console.error(error);
    throw {
        code: 0,
        message: error.message ? error.message : "Database connection error",
    };
}

let db = conn.db("nurseries_db");

export default db;