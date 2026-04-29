import React, { useState } from 'react';
import { Search, FileText, Download, Building2, MapPin, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CompanyData {
  razao_social: string;
  estabelecimento: {
    cnpj: string;
    nome_fantasia: string;
    situacao_cadastral: string;
    data_inicio_atividade: string;
    tipo_logradouro: string;
    logradouro: string;
    numero: string;
    bairro: string;
    cep: string;
    cidade: { nome: string };
    estado: { sigla: string };
    atividade_principal: { codigo: string; descricao: string };
  };
}

export default function App() {
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CompanyData | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnpj(formatCnpj(e.target.value));
  };

  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCnpj = cnpj.replace(/\D/g, '');
    
    if (cleanCnpj.length !== 14) {
      setError('Por favor, digite um CNPJ válido com 14 dígitos.');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);
    setDownloadUrl(null);

    try {
      const response = await fetch('/api/consultar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj: cleanCnpj }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error('O servidor retornou uma resposta inválida (HTML em vez de JSON). Isso geralmente acontece quando as rotas de API não estão configuradas corretamente no ambiente de hospedagem.');
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao consultar CNPJ');
      }

      setData(result.data);
      setDownloadUrl(result.download);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = () => {
    if (downloadUrl) {
      // 1. Download the internal PDF
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `certidao_consolidada_${cnpj.replace(/\D/g, '')}.pdf`;
      link.click();

      // 2. Open external portals
      const portals = [
        "https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf",
        "https://www.tst.jus.br/certidao1",
        "https://efisco.sefaz.pe.gov.br/sfi_trb_gpf/PREmitirCertidaoNegativaNarrativaDebitoFiscal",
        "https://servicos.receitafederal.gov.br/servico/certidoes/#/home/cnpj"
      ];

      portals.forEach(url => {
        window.open(url, '_blank');
      });
    }
  };

  const certificateTypes = [
    { id: 'fgts', name: 'FGTS (CRF)', organ: 'Caixa Econômica', url: 'https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf' },
    { id: 'tst', name: 'Trabalhista (CNDT)', organ: 'Tribunal Superior do Trabalho', url: 'https://www.tst.jus.br/certidao1' },
    { id: 'sefaz', name: 'Fiscal Estadual', organ: 'Sefaz PE', url: 'https://efisco.sefaz.pe.gov.br/sfi_trb_gpf/PREmitirCertidaoNegativaNarrativaDebitoFiscal' },
    { id: 'receita', name: 'Fiscal Federal', organ: 'Receita Federal / PGFN', url: 'https://servicos.receitafederal.gov.br/servico/certidoes/#/home/cnpj' },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans text-[#1a1a1a] selection:bg-blue-100">
      {/* Header */}
      <header className="border-b border-black/5 bg-white py-6">
        <div className="mx-auto max-w-5xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileText className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Certidão Express <span className="text-blue-600">Multi</span></h1>
          </div>
          <div className="text-xs font-mono text-gray-400 uppercase tracking-widest">
            v2.0.0 / AUTOMATION
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        {/* Search Section */}
        <section className="mb-12">
          <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8">
            <h2 className="text-2xl font-semibold mb-2">Automação de Certidões</h2>
            <p className="text-gray-500 mb-8">Consulte dados e prepare a emissão das 4 certidões obrigatórias simultaneamente.</p>
            
            <form onSubmit={handleConsultar} className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={handleCnpjChange}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-lg font-mono"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                {loading ? 'Processando...' : 'Iniciar Automação'}
              </button>
            </form>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Results Section */}
        <AnimatePresence>
          {data && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Company Summary Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
                <div className="bg-blue-50 px-8 py-4 border-b border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Building2 className="w-5 h-5" />
                    <span className="font-semibold">Dados da Empresa Identificada</span>
                  </div>
                  <button
                    onClick={handleDownloadAll}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Baixar Tudo
                  </button>
                </div>
                <div className="p-8">
                   <h3 className="text-xl font-bold mb-1">{data.razao_social}</h3>
                   <p className="text-gray-500 font-mono text-sm">{cnpj}</p>
                </div>
              </div>

              {/* Certificates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {certificateTypes.map((cert) => (
                  <motion.div
                    key={cert.id}
                    whileHover={{ y: -4 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="bg-gray-100 p-3 rounded-xl">
                          <FileText className="w-6 h-6 text-gray-600" />
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-wider">
                          Pendente CAPTCHA
                        </span>
                      </div>
                      <h4 className="text-lg font-bold mb-1">{cert.name}</h4>
                      <p className="text-xs text-gray-400 mb-4">{cert.organ}</p>
                    </div>
                    <a
                      href={cert.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                      Abrir Portal de Emissão
                      <Search className="w-4 h-4" />
                    </a>
                  </motion.div>
                ))}
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-12 border-t border-black/5">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm text-gray-400">
            &copy; 2026 Certidão Express. Todos os direitos reservados.<br />
            Desenvolvido para agilizar processos burocráticos.
          </p>
        </div>
      </footer>
    </div>
  );
}
