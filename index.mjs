import express from "express";
import cors from "cors";
import "./loadEnviroment.mjs";
import "express-async-errors";
import helmet from 'helmet';
import bodyParser from 'body-parser'; // Import body-parser
import users from "./routes/users.mjs";
import categories from "./routes/categories.mjs";
import nurseries from "./routes/nurseries.mjs";
import products from "./routes/products.mjs";
import nurseryBookmarks from "./routes/nurseryBookmarks.mjs";
import productsBookmarks from "./routes/productsBookmarks.mjs";
import carts from "./routes/carts.mjs";
import gifts from "./routes/gifts.mjs";
import orders from "./routes/orders.mjs";
import pots from "./routes/pots.mjs";
import savedAddress from "./routes/savedAddress.mjs";
import nurseryReview from "./routes/nurseryReviews.mjs"
const app = express();

const PORT = process.env.PORT || 2024;
app.disable('x-powered-by');
app.use(cors());
app.use(helmet());

// Use body-parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

//routes
app.use("/users", users);
app.use("/categories", categories);
app.use("/nurseries", nurseries);
app.use("/products", products);
app.use("/nurseryBookmarks", nurseryBookmarks);
app.use("/productsBookmarks", productsBookmarks);
app.use("/carts", carts);
app.use("/gifts", gifts);
app.use("/orders", orders);
app.use("/pots", pots);
app.use("/savedAddress", savedAddress);
app.use("/nurseryReview", nurseryReview)

app.get("/", (req, res) => {
    res.status(200).send("Welcome to the server.....")
});

// Global error handling
app.use((err, _req, res, next) => {
    res.status(500).send("Uh oh! An unexpected error occurred.");
});

// start the Express server
app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});