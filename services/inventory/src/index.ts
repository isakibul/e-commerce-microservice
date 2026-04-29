import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";

import {
  createInventory,
  getInventoryById,
  getInventoryDetails,
  updateInventory,
} from "./controllers";

dotenv.config();

const app = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "Up" });
});

/**
 * CORS middleware
 * Only allow requests from the API Gateway
 */
// app.use((req, res, next) => {
//   const allowedOrigins = ["http://localhost:8081", "http://127.0.0.1:8081"];
//   const origin = req.headers.origin || "";

//   if (allowedOrigins.includes(origin)) {
//     res.setHeader("Access-Control-Allow-Origin", origin);
//     next();
//   } else {
//     res.status(403).json({ error: "Forbidden" });
//   }
// });

/**
 * Routes
 */
app.put("/inventories/:id", updateInventory);
app.get("/inventories/:id", getInventoryById);
app.get("/inventories/:id/details", getInventoryDetails);
app.post("/inventories", createInventory);

/**
 * 404 handler
 */
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

/**
 * Error handler
 */
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal Server Error" });
  },
);

const PORT = process.env.PORT || 4002;
console.log(process.env.DATABASE_URL);
const serviceName = process.env.SERVICE_NAME || "Inventory-Service";

app.listen(PORT, () => {
  console.log(`${serviceName} is running on port ${PORT}`);
});
