import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();

app.use(cors());
app.use(express.json());

// Rota de Teste/Health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rota de Consulta de CNPJ
app.post("/api/consultar", async (req, res) => {
  try {
    const { cnpj } = req.body;
    if (!cnpj) return res.status(400).json({ error: "CNPJ não fornecido" });

    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) return res.status(400).json({ error: "CNPJ inválido" });

    const response = await axios.get(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`);
    res.json({ 
      success: true, 
      data: response.data,
      download: `/api/download/${cleanCnpj}` 
    });
  } catch (error: any) {
    console.error("Erro na consulta:", error.message);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.message || "Erro ao consultar CNPJ." 
    });
  }
});

// Rota de Download (PDF)
app.get("/api/download/:cnpj", async (req, res) => {
  const { cnpj } = req.params;
  try {
    const response = await axios.get(`https://publica.cnpj.ws/cnpj/${cnpj}`);
    const data = response.data;

    // Importação dinâmica para evitar que falhas no PDFKit derrubem a API
    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=certidao_${cnpj}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text("CERTIDÃO DE DADOS CADASTRAIS", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Razão Social: ${data.razao_social}`);
    doc.text(`CNPJ: ${data.estabelecimento.cnpj}`);
    doc.text(`Situação: ${data.estabelecimento.situacao_cadastral}`);
    doc.moveDown();
    doc.fontSize(10).text("Links para validação oficial:");
    doc.text("- FGTS: https://consulta-crf.caixa.gov.br/");
    doc.text("- Trabalhista: https://www.tst.jus.br/certidao1");
    doc.text("- Sefaz PE: https://efisco.sefaz.pe.gov.br/sfi_trb_gpf/PREmitirCertidaoNegativaNarrativaDebitoFiscal");
    doc.text("- Receita Federal: https://servicos.receitafederal.gov.br/servico/certidoes/#/home/cnpj");
    
    doc.end();
  } catch (error: any) {
    console.error("Erro no PDF:", error.message);
    res.status(500).send("Erro ao gerar documento.");
  }
});

// Capturador de erros global
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Erro Crítico:", err);
  res.status(500).json({ error: "Erro interno no servidor" });
});

export default app;





