import express from "express";
import cors from 'cors';
import http from 'http'

import 'dotenv/config'
import connectDB from "./config/db.js";

const app = express()

const PORT = 5000;

// DB
connectDB()


// Middleware
app.use(cors())
app.use(express.json())


// Routes
app.get('/', (req, res) => {
    res.send("API Working....")
})

const server = http.createServer(app);

server.listen(PORT, ()=>{
    console.log(`Server Stated on http://localhost:${PORT}`)
})

