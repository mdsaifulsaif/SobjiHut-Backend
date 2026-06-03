import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./app/routes/routes";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";

const app: Application = express();

// --- Standard Middlewares ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS Configuration
app.use(
  cors({
    origin: [
      "https://cartity-admin-dashboard.vercel.app",
      "https://cartify-frontend-fawn.vercel.app",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    ],
    credentials: true,
  }),
);

// --- Root API Route ---

app.use("/api/v1", router);

// --- Testing Route ---
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Glowly Ecommerce API is running!",
  });
});

// --- 404 Handler (Global) ---
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Not Found",
    errorMessages: [
      {
        path: req.originalUrl,
        message: "API Not Found",
      },
    ],
  });
});

app.use(globalErrorHandler);

export default app;
