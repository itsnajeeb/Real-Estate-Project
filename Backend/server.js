import express from "express";
import cors from 'cors';
import http from 'http'

import 'dotenv/config'
import connectDB from "./config/db.js";
import authRouter from "./routes/auth.route.js";
import userRouter from "./routes/user.routes.js";

const app = express()

const PORT = 5000;

// DB
connectDB()


// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }));

// Routes

app.use('/api/auth',authRouter)
app.use('/api/user',userRouter)

app.get('/', (req, res) => {
    res.send("API Working....")
})

const server = http.createServer(app);

server.listen(PORT, ()=>{
    console.log(`Server Stated on http://localhost:${PORT}`)
})

