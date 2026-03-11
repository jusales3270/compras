// ============================================================
// DATA: All 7 checklists from the PDF
// ============================================================
export const CHECKLISTS = {
    a: {
        id: "a",
        title: "Análise Inicial do DFD",
        subtitle: "Verificar se o DFD está completo e devidamente preenchido",
        color: "#2563eb",
        sections: [
            {
                title: "Preenchimento do DFD",
                items: [
                    "Identificação da Secretaria solicitante",
                    "Nome do responsável pela demanda",
                    "Descrição clara da necessidade administrativa",
                    "Justificativa da contratação",
                    "Demonstração do interesse público",
                    "Quantidade estimada do objeto",
                    "Indicação de prazo ou período de utilização",
                    "Indicação de dotação ou previsão orçamentária (quando exigido)",
                    "Identificação se a contratação está prevista no PCA",
                    "Assinatura da autoridade requisitante",
                ],
                alert: "Conferir se a justificativa não descreve o produto, mas sim a necessidade da administração.",
            },
            {
                title: "Compatibilidade com o PCA",
                items: [
                    "Objeto está previsto no Plano Anual de Contratações",
                    "Caso não esteja, existe justificativa para contratação fora do PCA",
                    "Valor estimado condiz com o planejado",
                ],
            },
            {
                title: "Definição do Objeto",
                items: [
                    "Objeto descrito de forma clara, precisa e suficiente",
                    "Sem direcionamento de marca ou fornecedor",
                    "Descrição permite competição de mercado",
                    "Especificações usuais de mercado",
                ],
            },
            {
                title: "Estimativa de Quantidade",
                items: [
                    "Quantidade justificada tecnicamente",
                    "Base em consumo anterior, planejamento da secretaria e demanda estimada",
                ],
                alert: "Evitar quantidades arbitrárias.",
            },
            {
                title: "Estimativa de Valor",
                items: [
                    "Existe estimativa preliminar de valor",
                    "Foi indicada fonte de pesquisa (contratações anteriores, mercado etc.)",
                ],
            },
        ],
    },
    b: {
        id: "b",
        title: "Análise sobre Necessidade de ETP",
        subtitle: "Estudo Técnico Preliminar",
        color: "#7c3aed",
        sections: [
            {
                title: "Verificação do ETP",
                items: [
                    "Foi elaborado ETP – Estudo Técnico Preliminar",
                    "Justificativa de dispensa do ETP, conforme hipóteses do Decreto Municipal",
                ],
                info: "Exemplos de dispensa/faculdade: baixo valor, objeto simples, solução já consolidada, taxa de inscrição ou participação.",
            },
        ],
    },
    c: {
        id: "c",
        title: "Inexigibilidade – Locação de Imóveis",
        subtitle: "Checklist para locação de imóveis",
        color: "#059669",
        sections: [
            {
                title: "DFD",
                items: [
                    "DFD descreve o problema a ser resolvido, sem antecipar a solução",
                    "Justificativa clara da necessidade administrativa",
                    "Indicação da secretaria demandante",
                    "Assinatura do responsável pela demanda",
                ],
            },
            {
                title: "Planejamento da Contratação",
                items: [
                    "Demanda está prevista no Plano Anual de Contratações – PCA",
                    "Caso não esteja, houve justificativa e atualização do PCA",
                    "Certificação de inexistência de imóvel próprio para uso",
                ],
            },
            {
                title: "Pesquisa de Preços ou Justificativa",
                items: [
                    "Pesquisa de preços anexada (quando aplicável)",
                    "Metodologia de cálculo definida",
                    "Valor estimado da contratação indicado",
                ],
            },
            {
                title: "Formalização Orçamentária",
                items: [
                    "Dotação orçamentária informada",
                    "Reserva orçamentária realizada",
                    "Fonte de recurso indicada",
                ],
            },
        ],
    },
    d: {
        id: "d",
        title: "Inexigibilidade – Notória Especialização",
        subtitle: "Art. 74, III – Lei 14.133",
        color: "#dc2626",
        sections: [
            { title: "Justificativa da Contratação", items: ["Documento justificando a inexigibilidade", "Fundamentação no art. 74 da Lei 14.133", "Demonstração da impossibilidade de competição"] },
            { title: "Comprovação da Notória Especialização", items: ["Currículo ou portfólio do profissional/empresa", "Comprovação de experiência anterior relevante", "Trabalhos técnicos ou publicações", "Certificados ou qualificações profissionais", "Premiações, reconhecimento ou reputação no mercado", "Contratações anteriores semelhantes"] },
            { title: "Demonstração da Singularidade do Serviço", items: ["Descrição detalhada do serviço especializado", "Demonstração de que não é serviço comum", "Justificativa de que o contratado possui capacidade diferenciada"] },
            { title: "Justificativa da Escolha do Contratado", items: ["Documento justificando por que aquele profissional ou empresa foi escolhido"] },
            { title: "Proposta do Contratado", items: ["Proposta comercial anexada", "Descrição do serviço", "Valor do serviço"] },
            { title: "Compatibilidade de Preços", items: ["Justificativa de que o valor está compatível com o mercado", "Comparação com contratos similares (quando possível)"] },
            { title: "Documentação do Fornecedor", items: ["Cartão CNPJ", "Contrato social ou estatuto", "Documentos do representante legal", "Dados bancários"] },
            { title: "Certidões e Consultas Obrigatórias", items: ["Certidão de débitos federais", "Certidão estadual", "Certidão municipal", "Certidão FGTS (se PJ)", "Consulta CEIS", "Consulta CNEP", "Certidão de apenados do TCE"] },
        ],
    },
    e: {
        id: "e",
        title: "Inexigibilidade – Exclusividade",
        subtitle: "Art. 74, I – Lei 14.133",
        color: "#ea580c",
        sections: [
            { title: "Justificativa da Inexigibilidade", items: ["Fundamentação legal no art. 74 da Lei 14.133", "Demonstração da impossibilidade de competição"] },
            { title: "Comprovação de Exclusividade", items: ["Declaração de exclusividade do fabricante ou distribuidor", "Declaração emitida por entidade oficial ou representativa", "Documento que comprove distribuição exclusiva"] },
            { title: "Identificação do Produto ou Serviço", items: ["Descrição detalhada do produto ou serviço", "Especificações técnicas", "Demonstração de que não há substituto equivalente"] },
            { title: "Proposta do Fornecedor Exclusivo", items: ["Proposta comercial anexada", "Valor unitário ou total", "Condições de fornecimento"] },
            { title: "Justificativa de Preço", items: ["Preço compatível com o mercado", "Comparação com contratações anteriores", "Comparação com outros órgãos públicos"] },
            { title: "Documentação do Fornecedor", items: ["Cartão CNPJ", "Contrato social ou estatuto", "Documentos do representante legal", "Dados bancários"] },
            { title: "Certidões e Consultas Obrigatórias", items: ["Certidão de débitos federais", "Certidão estadual", "Certidão municipal", "Certidão FGTS (se PJ)", "Consulta CEIS", "Consulta CNEP", "Certidão de apenados do TCE"] },
        ],
    },
    f: {
        id: "f",
        title: "Cotação – Licitação",
        subtitle: "Pesquisa de preços para processos licitatórios",
        color: "#0891b2",
        sections: [
            { title: "Fontes de Pesquisa Utilizadas", items: ["Painel de Preços do Governo Federal", "Banco de preços", "PNCP – contratações públicas", "Contratações de outros entes públicos", "Contratações do próprio município", "Pesquisa direta com fornecedores", "Sites especializados ou catálogos", "Base de notas fiscais eletrônicas", "Atas de registro de preços"], alert: "Preferir mais de uma fonte." },
            { title: "Quantidade Mínima de Cotações", items: ["Preferencialmente 3 preços válidos", "Se menos de 3: existe justificativa no processo"] },
            { title: "Compatibilidade do Objeto Pesquisado", items: ["Mesma descrição", "Mesmas especificações técnicas", "Mesma unidade de medida", "Mesma quantidade ou proporcionalidade", "Mesmas condições de fornecimento"], alert: "Evitar comparar objetos diferentes." },
            { title: "Atualidade da Pesquisa", items: ["Pesquisa realizada recentemente", "Não utilizar preços defasados"], info: "Boa prática: até 6 meses para fornecedores/tabelas; até 1 ano para contratações similares de outros órgãos (preferencialmente SP)." },
            { title: "Metodologia de Cálculo do Preço Estimado", items: ["Média dos preços", "Mediana", "Menor preço válido", "Outro critério justificado"], alert: "Excluir preços manifestamente inexequíveis ou excessivos." },
            { title: "Análise de Preços Discrepantes", items: ["Foram identificados preços muito acima ou muito abaixo", "Houve desconsideração justificada de valores fora da realidade"] },
            { title: "Identificação dos Fornecedores (cotação direta)", items: ["Nome da empresa", "CNPJ", "Data da cotação", "Justificativa da escolha do fornecedor", "Valor unitário e total", "Identificação de quem enviou a cotação", "Cotação em papel timbrado ou e-mail identificável"] },
            { title: "Verificação Mínima do Fornecedor", items: ["CNPJ existente na Receita Federal", "Empresa atua no ramo do objeto", "Não aparenta ser empresa incompatível com o objeto"], alert: "Evitar empresa de ramo diferente, inexistente ou irregular." },
            { title: "Independência entre Fornecedores", items: ["Empresas não são do mesmo grupo econômico", "Não possuem mesmo endereço ou CNPJ raiz idêntico"], alert: "Evitar cotações fictícias ou simuladas." },
            { title: "Registro Documental da Pesquisa", items: ["Prints de sites", "Links utilizados", "Propostas anexadas", "E-mails recebidos", "Planilha consolidada"] },
            { title: "Mapa Comparativo de Preços", items: ["Identificação dos fornecedores", "Valores unitários", "Valores totais", "Preço estimado final"] },
            { title: "Conclusão da Pesquisa", items: ["Indicação clara do valor estimado da contratação", "Justificativa da metodologia adotada"] },
        ],
    },
    g: {
        id: "g",
        title: "Cotação – Compra Direta (Dispensa por Valor)",
        subtitle: "Dispensa em razão do valor",
        color: "#be185d",
        sections: [
            { title: "Existência da Pesquisa de Preços", items: ["Pesquisa de preços formalmente juntada no processo", "Pesquisa datada", "Pesquisa realizada antes da contratação"] },
            { title: "Fontes Utilizadas", items: ["Pesquisa direta com fornecedores com justificativa da escolha", "Bases oficiais de preços (quando aplicável)"] },
            { title: "Quantidade de Preços Obtidos", items: ["Preferencialmente 3 preços válidos", "Caso não haja 3: existe justificativa no processo"] },
            { title: "Compatibilidade do Objeto Pesquisado", items: ["Preços se referem ao mesmo objeto da contratação", "Mesma especificação técnica", "Mesma unidade de medida", "Mesma condição de fornecimento"], alert: "Evitar comparação com objetos diferentes ou incompletos." },
            { title: "Atualidade da Pesquisa", items: ["Pesquisa realizada recentemente", "Valores compatíveis com o mercado atual"], info: "Boa prática: pesquisa com até 6 meses." },
            { title: "Identificação da Origem dos Preços", items: ["Identificação da empresa ou fonte da pesquisa", "Indicação do CNPJ do fornecedor (cotação direta)", "Registro da data da cotação"] },
            { title: "Documentação da Pesquisa", items: ["Propostas anexadas", "Prints de sites ou páginas de preço", "E-mails de cotação", "Links das fontes consultadas"] },
            { title: "Análise de Preços Discrepantes", items: ["Verificação de preços muito altos ou muito baixos", "Exclusão justificada de valores inexequíveis ou fora da realidade"] },
            { title: "Existência e Situação Cadastral da Empresa", items: ["Consulta do CNPJ na Receita Federal", "Situação cadastral ATIVA", "Conferência da razão social e nome fantasia"] },
            { title: "Compatibilidade do Ramo de Atividade", items: ["Verificação do CNAE principal ou secundário", "CNAE compatível com o objeto cotado"], alert: "Evitar empresas de ramo totalmente diferente." },
            { title: "Dados da Empresa na Cotação", items: ["Cotação contém nome da empresa", "Cotação contém CNPJ", "Cotação contém contato ou identificação do responsável"] },
            { title: "Identificação da Origem da Cotação", items: ["Cotação enviada por e-mail identificável", "Cotação em papel timbrado", "Cotação obtida em site oficial da empresa"] },
            { title: "Verificação de Empresas Relacionadas", items: ["Empresas cotadas não pertencem ao mesmo grupo econômico", "Não possuem mesmo endereço ou sócios idênticos"], alert: "Evitar pesquisa com empresas ligadas entre si." },
            { title: "Compatibilidade Geográfica ou de Atuação", items: ["Empresa atua ou fornece no mercado compatível com a contratação"] },
            { title: "Conferência de Dados Básicos da Empresa", items: ["Endereço da empresa identificado", "Existência de site, redes ou contato comercial (quando possível)"] },
            { title: "Verificação de Indícios de Irregularidade", items: ["Não aparenta ser empresa inexistente ou inativa", "Não apresenta dados incompletos ou inconsistentes"] },
            { title: "Verificação do Limite Legal da Dispensa", items: ["Valor estimado dentro do limite (art. 75 Lei 14.133 e Decreto nº 12.807/2025)"], alert: "Verificar se não houve fracionamento de despesa." },
        ],
    },
};

export const STATUS_OPTIONS = [
    { value: "aguardando_dfd", label: "Aguardando DFD", color: "#f59e0b" },
    { value: "analise_dfd", label: "Análise do DFD", color: "#3b82f6" },
    { value: "analise_ia", label: "Análise IA", color: "#8b5cf6" },
    { value: "revisao_servidor", label: "Revisão do Servidor", color: "#6366f1" },
    { value: "etp", label: "ETP", color: "#7c3aed" },
    { value: "cotacao", label: "Cotação", color: "#06b6d4" },
    { value: "validacao_secretaria", label: "Validação Secretaria", color: "#f97316" },
    { value: "lancamento_sistema", label: "Lançamento no Sistema", color: "#10b981" },
    { value: "analise_lancamento", label: "Análise Lançamento", color: "#6366f1" },
    { value: "concluido", label: "Concluído", color: "#22c55e" },
    { value: "suspenso", label: "Suspenso", color: "#ef4444" },
];

export const SERVIDORES = ["Servidor 1", "Servidor 2", "Servidor 3", "Servidor 4"];
