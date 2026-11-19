<div align="center">
  <img width="160" height="160" alt="Logotipo do Mutirão — Plataforma de organização do cuidado compartilhado" src="https://github.com/user-attachments/assets/7f5afb00-bfa5-4806-bf06-e0ecd62067a9" />
  <h1>Mutirão</h1>
  <h3>O cuidar fica mais leve quando formamos um mutirão.</h3>
  <p><b>Global Solution 2026 · Citizen Tech · Web Design FIAP</b></p>
  <p>Mutirão conecta familiares e cuidadores para organizar a rotina, dividir responsabilidades e passar adiante o que aconteceu no cuidado compartilhado.</p>
  <p>
    <a href="https://mutirao-citizen-tech.vercel.app/">Acessar o Mutirão</a> ·
    <a href="https://mutirao-pontobot-frontend.vercel.app/">PontoBOT (Assistente)</a> ·
    <a href="https://github.com/mewmewdevart/PontoBOT">Repositório PontoBOT</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Desafio-Citizen%20Tech-4B5DA9?style=for-the-badge" alt="Desafio Citizen Tech" />
    <img src="https://img.shields.io/badge/HTML%20%7C%20CSS%20%7C%20JS-Nativo-4B5DA9?style=for-the-badge" alt="HTML, CSS e JS Nativos" />
    <img src="https://img.shields.io/badge/Testes-17%20passando-4B5DA9?style=for-the-badge" alt="17 testes passando" />
  </p>
</div>


<br>

## 📌 Resumo do Projeto

O **Mutirão** é um protótipo funcional desenvolvido para a **Global Solution 2026 da FIAP**, no desafio **Citizen Tech** (equipe **Ctrl + People**). O projeto nasce de uma dor cotidiana no cuidado compartilhado: quando horários, doses de remédios, receitas e recados ficam espalhados em conversas e anotações soltas, quem assume o próximo turno precisa reconstruir o combinado do zero.

A plataforma reúne **12 páginas HTML semânticas** conectadas por JavaScript nativo, com persistência por ficha na sessão do navegador (`sessionStorage`), dois temas visuais (**Neutro** e **Acolhedor**), recursos assistivos de leitura e integração com o assistente de navegação **PontoBOT**.

- **Acesso ao protótipo:** Entre e use o seletor de pessoa acompanhada para alternar entre **Flavinho** e **Mari**. A rotina de cada pessoa tem dados fictícios e usa 10/11/2026 como data de referência.
- **PontoBOT:** O componente em `assets/pontobot/` vem do [repositório PontoBOT](https://github.com/mewmewdevart/PontoBOT) e contém cópia local da interface e da ajuda de contingência. Atualize essa cópia ao incorporar mudanças do componente. As perguntas continuam sendo enviadas ao serviço PontoBOT e, se a requisição falhar, o assistente responde com a base local.


<img width="2858" height="1604" alt="mutirao-citizen-tech vercel app_home html" src="https://github.com/user-attachments/assets/e1f6f84b-a0ec-4bd6-9926-ed36d89438d3" />


## ✨ Principais Soluções e Diferenciais

- **Passagem de cuidado integrada:** Assumir um turno, registrar uma dose e anotar o turno refletem simultaneamente no **Início**, na **Agenda**, em **Medicamentos** e na **Ficha**.
- **Escala com distinção entre vazio e lacuna:** Diferencia acompanhamento integral (24h), rotinas recorrentes (diárias e semanais), exceções por data e turnos pontuais.
- **Porta-remédios compartilhado e estoque:** Agrupamento por horário com registro de dose dada, pendência com motivo, desfazer e saldo derivado por ficha.
- **Apoio à rede e serviços públicos:** Guia e questionário em **Direitos e serviços** com busca territorial (IBGE e ViaCEP), mural de recados, pedidos de folga e catálogo de referências em **Documentos**.
- **Acessibilidade e dois temas visuais:** Temas **Neutro** (`Inter`, `#4B5DA9`) e **Acolhedor** (neobrutalismo suave com `Onest`, `Gloock`, `Gochi Hand` e `#146A3A`), além de painel de recursos assistivos (alto contraste, escala de fonte, espaçamento de texto, destaque de links, redução de animações e VLibras).
- **Assistente PontoBOT:** Web Component integrado para orientação de navegação em linguagem natural, com contingência local e backend dedicado.


## 📁 Estrutura do Projeto

```text
CitizenTechFIAPChallenge/
├── assets/
│   ├── css/
│   │   ├── variaveis.css        # Tokens de cor, tipografia, espaçamento, temas e alto contraste
│   │   ├── style.css            # Estrutura global, barra lateral, topo, busca e responsividade
│   │   ├── componentes.css      # Botões, selos, alertas, formulários, rodapé e estados
│   │   ├── acessibilidade.css   # Painel lateral de recursos assistivos
│   │   ├── painel-cuidado.css   # Início, porta-remédios, passagem de cuidado e mural
│   │   ├── agenda.css           # Calendário, tarefas e escala de turnos
│   │   ├── ficha.css            # Ficha da pessoa acompanhada, Diário e impressão
│   │   ├── recursos-apoio.css   # Documentos, Pessoas e Direitos e serviços
│   │   ├── configuracoes.css    # Preferências de avisos e seleção de tema
│   │   ├── ajuda.css            # Perguntas frequentes e formulário demonstrativo
│   │   ├── login.css            # Tela de entrada e mascotes interativos
│   │   └── mvp-telas.css        # Complementos de telas e calendário mensal
│   ├── data/
│   │   └── perfis-acompanhados.json  # Base fictícia de Mari e Flavio (referência 10/11/2026)
│   ├── js/
│   │   ├── estado-cuidado.mjs   # Normalização, migração (v1 → v2), isolamento e persistência
│   │   ├── nucleo-cuidado.js    # Regras de escala, doses, estoque, Diário e eventos
│   │   ├── script.js            # Navegação, seletor de perfil, busca global e PontoBOT
│   │   ├── acessibilidade.js    # Preferências de leitura e alternância de temas
│   │   └── *.js                 # Controladores específicos de cada página
│   └── media/                   # Mascotes SVG, ícones, stickers, avatares e sons
├── tests/                       # Suíte automatizada com node:test (17 testes)
├── *.html                       # 12 páginas HTML semânticas na raiz
└── README.md                    # Documentação do projeto
```

### Páginas do Protótipo (12 telas)

| Página | Arquivo | Responsabilidade |
| :--- | :--- | :--- |
| Entrada | `index.html` | Acesso demonstrativo, validação e mascotes (`login.js`) |
| Início | `home.html` | Prioridades do turno, porta-remédios, próximos compromissos e passagem (`inicio.js`, `porta-remedios.js`) |
| Agenda | `agenda.html` | Calendário mensal, exportação ICS, tarefas e escala (`agenda.js`) |
| Medicamentos | `medicamentos.html` | Doses por horário, anotações, itens e estoque (`medicamentos.js`, `porta-remedios.js`) |
| Ficha | `ficha.html` | Dados da pessoa acompanhada, acompanhamento e Diário (`mvp-telas.js`) |
| Documentos | `documentos.html` | Referências pesquisáveis por categoria e vínculo com compromissos (`documentos.js`) |
| Pessoas da rede | `pessoas.html` | Participantes e convites simulados (`pessoas.js`) |
| Meu perfil | `meu-perfil.html` | Conta demonstrativa do Zé, pedidos de folga e mural de recados (`meu-perfil.js`, `mural-recados.js`) |
| Direitos e serviços | `direitos.html` | Guia, questionário e consulta territorial via IBGE e ViaCEP (`direitos.js`) |
| Configurações | `configuracoes.html` | Preferências de avisos na sessão e seleção de tema (`configuracoes.js`) |
| Ajuda | `ajuda.html` | Perguntas frequentes e atendimento demonstrativo (`ajuda.js`) |
| Privacidade | `privacidade.html` | Transparência sobre dados simulados, armazenamento local e integrações (`script.js`) |


## 🛠️ Tecnologias Utilizadas

- **HTML5 semântico** — regiões (`main`, `nav`, `aside`, `header`, `footer`), diálogos nativos e atributos ARIA.
- **CSS3** — design tokens em variáveis CSS, temas **Neutro**, **Acolhedor** e **Alto Contraste**, Grid/Flexbox e breakpoints responsivos.
- **JavaScript nativo (ES Modules e IIFE)** — gerenciamento de estado imutável por ficha (`estado-cuidado.mjs`), regras de negócio (`nucleo-cuidado.js`) e manipulação do DOM.
- **Node.js (`node:test`)** — executor nativo para validação automatizada das regras de negócio e persistência.
- **Integrações externas:** Google Fonts, Font Awesome, Bootstrap Icons, VLibras, APIs IBGE/ViaCEP e assistente [PontoBOT](https://github.com/mewmewdevart/PontoBOT).


## 🚀 Como Executar Localmente

**Pré-requisitos:** Git, um navegador web e um servidor HTTP local (necessário para o navegador carregar `assets/data/perfis-acompanhados.json` via `fetch`). Para rodar os testes automatizados, utilize **Node.js 22+**.

1. Clone o repositório e acesse a pasta do projeto:

   ```bash
   git clone https://github.com/mewmewdevart/CitizenTechFIAPChallenge.git
   cd CitizenTechFIAPChallenge
   ```

2. Inicie um servidor HTTP local na raiz do projeto (ex.: com Live Server do VS Code ou Python):

   ```bash
   python -m http.server 8000 --bind 127.0.0.1
   ```

   Acesse `http://127.0.0.1:8000/` no navegador.


## 🧪 Qualidade e Testes Automatizados

Execute a suíte completa na raiz do projeto com o executor nativo do Node.js:

```bash
node --test tests/*.test.mjs
```

Atualmente a suíte conta com **19 testes** distribuídos em **5 arquivos**:

| Arquivo | Casos | Cobertura |
| :--- | :---: | :--- |
| `tests/estado-cuidado.test.mjs` | 5 | Seleção de perfil, recarga, isolamento, migrações (`v1` → `v2`), saldo zero e falha de gravação |
| `tests/compromissos-agenda.test.mjs` | 2 | Compromissos com horário opcional, isolamento entre perfis e exportação ICS |
| `tests/medicamentos-doses.test.mjs` | 2 | Preservação de finalidades da base, registro de dose e ação de desfazer |
| `tests/turnos-escala.test.mjs` | 2 | Normalização de rotinas semanais, janela diária e cobertura pontual |
| `tests/recorrencias-escala.test.mjs` | 8 | Inicialização com atraso ou falha, exceções por data, sobreposição de horas, aceite por escopo, conflitos futuros, transferência de rede e vínculo com medicamentos |


## 👥 Integrantes — Grupo Ctrl + People

- **Ingrid Silva de Lima** — RM 570149 — [rm570149@fiap.com.br](mailto:rm570149@fiap.com.br)
- **Larissa Cristina Benedito** — RM 570970 — [rm570970@fiap.com.br](mailto:rm570970@fiap.com.br)
- **Mayla Mayumi Motobe** — RM 571213 — [rm571213@fiap.com.br](mailto:rm571213@fiap.com.br)


<div align="center">
  <img  alt="Icone da Mari" src="https://github.com/user-attachments/assets/227e3796-35ed-431a-a4f0-d03852637bc9" />
</div>

## 🔗 Referências e Publicação

- **Website publicado:** [mutirao-citizen-tech.vercel.app](https://mutirao-citizen-tech.vercel.app/)
- **PontoBOT publicado:** [mutirao-pontobot-frontend.vercel.app](https://mutirao-pontobot-frontend.vercel.app/) · [Repositório](https://github.com/mewmewdevart/PontoBOT)
- **Protótipo no Figma:** [GS Citizen Tech · Idosos (Mutirão)](https://www.figma.com/design/mzWEL8c6qp2yhZBmiQ4hut/-Projeto--GS-Citizen-Tech---GS-Citizen-Tech---Mutir%C3%A3o?node-id=2013-960&t=FJw3krrMZXicKrdg-1)
- **Fundamentação social:** IBGE (PNAD Contínua 2022), ELSI-Brasil (Giacomin et al., 2018), *Managing the Binder* (Soni et al., 2026), Plano Brasil que Cuida (MDS) e ODS 5 (meta 5.4), ODS 3 e ODS 10 (ONU Brasil).
- **Normas de acessibilidade:** [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) e ABNT NBR 17225:2025.
