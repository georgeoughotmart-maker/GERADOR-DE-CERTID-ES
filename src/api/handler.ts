import express from "express";
import axios from "axios";
import PDFDocument from "pdfkit";

const router = express.Router();

// Middleware de log simples para debug no Vercel
router.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Health check for debugging
router.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    environment: process.env.NODE_ENV, 
    timestamp: new Date().toISOString(),
    url: req.url
  });
});

// API Route: Consultar CNPJ
router.post("/consultar", async (req, res) => {
  try {
    const { cnpj } = req.body;
    
    if (!cnpj) {
      return res.status(400).json({ error: "CNPJ não fornecido" });
    }

    const cleanCnpj = cnpj.replace(/\D/g, "");

    if (cleanCnpj.length !== 14) {
      return res.status(400).json({ error: "CNPJ inválido (deve ter 14 dígitos)" });
    }

    const response = await axios.get(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`);
    const data = response.data;

    res.json({ 
      success: true, 
      data: data,
      download: `/api/download/${cleanCnpj}` 
    });
  } catch (error: any) {
    console.error("Erro na rota /consultar:", error.message);
    const status = error.response?.status || 500;
    const message = error.response?.data?.message || "Erro ao consultar dados do CNPJ. Verifique se o número está correto.";
    res.status(status).json({ error: message });
  }
});

// API Route: Download Certidão (PDF)
router.get("/download/:cnpj", async (req, res) => {
  const { cnpj } = req.params;
  
  try {
    const response = await axios.get(`https://publica.cnpj.ws/cnpj/${cnpj}`);
    const data = response.data;

    // Usando try-catch interno para o PDF
    try {
      const doc = new PDFDocument({ margin: 50 });
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=certidao_${cnpj}.pdf`);
      
      doc.pipe(res);

      doc.fontSize(20).text("CERTIDÃO DE DADOS CADASTRAIS", { align: "center" });
      doc.moveDown();
      doc.fontSize(10).text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, { align: "right" });
      doc.moveDown(2);

      doc.fontSize(14).text("Dados da Empresa", { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(`Razão Social: ${data.razao_social}`);
      doc.text(`Nome Fantasia: ${data.estabelecimento.nome_fantasia || "N/A"}`);
      doc.text(`CNPJ: ${data.estabelecimento.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}`);
      doc.text(`Situação Cadastral: ${data.estabelecimento.situacao_cadastral}`);
      doc.text(`Data de Abertura: ${data.estabelecimento.data_inicio_atividade}`);
      doc.moveDown();

      doc.fontSize(14).text("Endereço", { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(`${data.estabelecimento.tipo_logradouro} ${data.estabelecimento.logradouro}, ${data.estabelecimento.numero}`);
      doc.text(`${data.estabelecimento.bairro} - ${data.estabelecimento.cidade.nome} / ${data.estabelecimento.estado.sigla}`);
      doc.text(`CEP: ${data.estabelecimento.cep}`);
      doc.moveDown();

      doc.fontSize(14).text("Atividade Principal", { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(`${data.estabelecimento.atividade_principal.codigo} - ${data.estabelecimento.atividade_principal.descricao}`);
      doc.moveDown(2);

      doc.fontSize(14).text("Certidões de Regularidade (Links para Emissão)", { underline: true });
      doc.moveDown();
      
      const certs = [
        { name: "FGTS (CRF - Caixa)", url: "https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf" },
        { name: "Trabalhista (CNDT - TST)", url: "https://www.tst.jus.br/certidao1" },
        { name: "Sefaz PE (Regularidade Fiscal)", url: "https://efisco.sefaz.pe.gov.br/sfi_trb_gcc/PREmitirCertidaoRegularidadeFiscal" },
        { name: "Receita Federal (Conjunta PGFN)", url: "https://servicos.receitafederal.gov.br/servico/certidoes/#/home/cnpj" }
      ];

      certs.forEach(cert => {
        doc.fontSize(11).fillColor("blue").text(cert.name, { link: cert.url, underline: true });
        doc.fontSize(9).fillColor("gray").text(cert.url);
        doc.moveDown(0.5);
      });
      
      doc.moveDown(2);
      doc.fillColor("black").fontSize(10).font("Helvetica-Oblique").text("Nota: Devido a requisitos de segurança (CAPTCHA) dos órgãos emissores, as certidões acima devem ser validadas nos portais oficiais utilizando os links fornecidos.", { align: "center" });

      doc.end();
    } catch (pdfError: any) {
      console.error("Erro ao gerar PDF:", pdfError.message);
      if (!res.headersSent) {
        res.status(500).send("Erro ao gerar o arquivo PDF.");
      }
    }
  } catch (error: any) {
    console.error("Erro ao buscar dados para PDF:", error.message);
    res.status(500).send("Erro ao buscar dados da empresa para o PDF.");
  }
});

export default router;
