import express from "express";
import cors from "cors";
import apiHandler from "../src/api/handler";

const app = express();

console.log("API Bootstrapping...");

app.use(cors());
app.use(express.json());

// No Vercel, a requisição já chega com o path completo (ex: /api/consultar)
// O handler já define rotas como /consultar, então montamos ele na raiz ou em /api
// Para ser seguro, montamos em ambos ou tratamos o prefixo
app.use("/api", apiHandler);
app.use("/", apiHandler); // Fallback para quando o rewrite já removeu o prefixo ou para chamadas diretas

export default app;


