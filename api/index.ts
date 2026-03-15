import express from "express";
import cors from "cors";
import apiHandler from "../src/api/handler";

const app = express();

app.use(cors());
app.use(express.json());

// Log de depuração para ver como o Vercel está passando a URL
app.use((req, res, next) => {
  console.log(`[API Debug] Method: ${req.method}, URL: ${req.url}, OriginalURL: ${req.originalUrl}`);
  next();
});

// Teste direto
app.get("/api/test", (req, res) => {
  res.json({ 
    message: "API is working", 
    url: req.url,
    originalUrl: req.originalUrl,
    env: process.env.NODE_ENV
  });
});

// Monta o handler
// Se o Vercel reescreve /api/consultar para /api, o req.url pode ser /consultar ou /api/consultar
app.use("/api", apiHandler);
app.use("/", apiHandler); // Tenta ambos para garantir

export default app;




