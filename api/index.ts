import express from "express";
import cors from "cors";
import apiHandler from "../src/api/handler";

const app = express();

app.use(cors());
app.use(express.json());

// No Vercel, o prefixo /api já é tratado pelo roteamento do vercel.json
// Mas para garantir compatibilidade com o handler que espera sub-rotas:
app.use("/api", apiHandler);

export default app;

