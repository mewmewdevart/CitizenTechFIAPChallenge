<div align="center">
  <img width="160" height="160" alt="Logotipo do Mutirão — Plataforma de organização do cuidado compartilhado" src="https://github.com/user-attachments/assets/d8184c61-a040-4771-9bc1-860f6ddcb88a" />
  <h1>Mutirão</h1>
  <h3>O cuidar fica mais simples quando fazemos um mutirão!</h3>
  <p><b>Global Solution 2026 · Citizen Tech · Web Design FIAP</b></p>
  <p>Mutirão conecta familiares e cuidadores para organizar a rotina, dividir responsabilidades e acompanhar informações de saúde no cuidado compartilhado de pessoas de qualquer idade.</p>
  <p><a href="https://mutirao-citizen-tech.vercel.app/">Acessar o Projeto</a></p>
  <p>
    <img src="https://img.shields.io/badge/Desafio-Citizen%20Tech-8495E1?style=for-the-badge" alt="Desafio Citizen Tech" />
    <img src="https://img.shields.io/badge/Projeto-Acad%C3%AAmico-8495E1?style=for-the-badge" alt="Projeto acadêmico" />
  </p>
</div>

<br>

## 📌 Resumo do Projeto

O **Mutirão** é uma plataforma desenvolvida para a **Global Solution 2026 da FIAP**, no desafio **Citizen Tech**. O projeto parte de uma situação comum no cuidado compartilhado de pessoas de qualquer idade: quando informações sobre compromissos, tarefas e saúde ficam espalhadas em conversas e anotações, familiares e cuidadores têm dificuldade para acompanhar o que precisa ser feito e quem ficou responsável por cada atividade.

A proposta centraliza essas informações em um único espaço compartilhado, facilitando a organização da rotina, a divisão equilibrada de tarefas e o acompanhamento do cuidado no dia a dia.

<!-- Insira uma captura da landing page ou do protótipo com texto alternativo. -->

## ✨ Principais Soluções e Diferenciais

- **Rotina de cuidado** — centraliza compromissos, horários e tarefas diárias em um só lugar.
- **Divisão de responsabilidades** — distribui tarefas com clareza entre familiares e cuidadores.
- **Acompanhamento de saúde** — reúne observações e registros relevantes para apoiar a rede de cuidado no dia a dia.

<!-- Revise os itens conforme o escopo confirmado e indique o que já está disponível. -->

## 📁 Estrutura do Projeto

O painel é uma aplicação multipágina em HTML, CSS e JavaScript. `home.html` abre o Início. As outras páginas ficam na raiz, e os estilos, scripts e imagens ficam em `assets/`.

O cenário de demonstração usa 10 de novembro de 2026 como referência. A base fixa de Mari e Flavio fica em `assets/data/perfis-acompanhados.json`. O navegador salva na aba atual a seleção e as alterações de cada ficha. A conta do Zé é comum, e os registros de cuidado e a administração de cada rede pertencem à ficha selecionada. Convites e mensagens da Ajuda são simulados, e Documentos cadastra referências sem guardar anexos.

```text
CitizenTechFIAPChallenge/
├── assets/
│   ├── css/       # Estilos compartilhados e por seção
│   ├── data/      # Base dos perfis acompanhados
│   ├── js/        # Scripts e interações da página
│   └── media/     # Logos, ícones e imagens
├── home.html     # Página principal
└── README.md      # Visão geral e instruções do projeto
```

## 🛠️ Tecnologias Utilizadas

- **HTML5** — estrutura semântica do painel e das páginas.
- **CSS3** — identidade visual, layout e responsividade.
- **JavaScript** — interações da interface.
- **Figma** — design e prototipação da interface.

## 🚀 Como Executar Localmente

**Pré-requisitos** — Git para clonar o repositório e um navegador web.

1. Clone o repositório e acesse a pasta do projeto.

   ```bash
   git clone https://github.com/mewmewdevart/CitizenTechFIAPChallenge.git
   cd CitizenTechFIAPChallenge
   ```

2. Sirva a pasta com a extensão **Live Server** do VS Code ou, se tiver Python, execute `python -m http.server 8000`. Abra `index.html` pelo endereço do servidor, por exemplo, `http://localhost:8000/`. O navegador carrega o JSON pelo servidor.

3. Se tiver Node.js 22 ou mais recente, execute `node --test tests/*.test.mjs` para rodar toda a suíte (11 testes cobrindo perfis fixos, isolamento, migração, turnos/escala, doses e compromissos).

## 👥 Integrantes — Grupo Ctrl + People

- **Ingrid Silva de Lima** — RM 570149 — [rm570149@fiap.com.br](mailto:rm570149@fiap.com.br)
- **Larissa Cristina Benedito** — RM 570970 — [rm570970@fiap.com.br](mailto:rm570970@fiap.com.br)
- **Mayla Mayumi Motobe** — RM 571213 — [rm571213@fiap.com.br](mailto:rm571213@fiap.com.br)


## 🔗 Referências

- [Figma — GS Citizen Tech · Idosos](https://www.figma.com/design/ETGakMsnSiQnkVIekTOnKi/GS-Citizen-Tech---Idosos?node-id=160-384)
- [Shields.io](https://shields.io/) — badges do README.
<!-- Inclua fontes da pesquisa, materiais da FIAP e créditos de imagens ou ícones utilizados. -->
