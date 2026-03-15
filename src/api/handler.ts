import express from "express";
import axios from "axios";
import PDFDocument from "pdfkit";

const router = express.Router();

// Health check for debugging
router.get("/health", (req, res) => {
  res.json({ status: "ok", environment: process.env.NODE_ENV, timestamp: new Date().toISOString() });
});

// API Route: Consultar CNPJ
router.post("/consultar", async (req, res) => {
  const { cnpj } = req.body;
  const cleanCnpj = cnpj.replace(/\D/g, "");

  if (cleanCnpj.length !== 14) {
    return res.status(400).json({ error: "CNPJ inválido" });
  }

  try {
    const response = await axios.get(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`);
    const data = response.data;

    res.json({ 
      success: true, 
      data: data,
      download: `/api/download/${cleanCnpj}` 
    });
  } catch (error) {
    console.error("Erro ao consultar CNPJ:", error);
    res.status(500).json({ error: "Erro ao consultar dados do CNPJ. Verifique se o número está correto." });
  }
});

// API Route: Download Certidão (PDF)
router.get("/download/:cnpj", async (req, res) => {
  const { cnpj } = req.params;
  
  try {
    const response = await axios.get(`https://publica.cnpj.ws/cnpj/${cnpj}`);
    const data = response.data;

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
  } catch (error) {
    res.status(500).send("Erro ao gerar PDF");
  }
});

export default router;
