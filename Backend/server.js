import express from "express";
import cors from 'cors';
import http from 'http'

import 'dotenv/config'
import connectDB from "./config/db.js";
import authRouter from "./routes/auth.route.js";
import userRouter from "./routes/user.routes.js";
import propertyRouter from "./routes/property.route.js";
import inquiryRouter from "./routes/inquiry.route.js";
import wishlistRouter from "./routes/wishlisht.route.js";

const app = express()

const PORT = 5000;

// DB
connectDB()


// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/property', propertyRouter)
app.use("/api/inquiry", inquiryRouter)
app.use("/api/wishlist", wishlistRouter)


app.get('/', (req, res) => {
    res.send("API Working....")
})

const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Server Stated on http://localhost:${PORT}`)
})

