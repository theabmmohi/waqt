import express from "express"
import cors from "cors"
import {
  createClient
} from "@supabase/supabase-js"

const server = express()
const supabase = createClient(process.env.SB_URL, process.env.SB_SECRET)

server.use(cors())
server.use(express.json())

server.get("/", (req, res) => {
  res.type("text").send("Im Alive!")
})

server.listen(8000, () => console.log("Server Running On Port: 8000"))