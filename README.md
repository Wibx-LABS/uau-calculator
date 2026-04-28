# WIBX - UAU Calculadora 🚀

<p align="center">
  <pre>
░█▀▀░█▀█░█░░░█▀▀░█░█░█░░░█▀█░█▀▄░█▀█░█▀▄░█▀█░░░█░█░█▀█░█░█
░█░░░█▀█░█░░░█░░░█░█░█░░░█▀█░█░█░█░█░█▀▄░█▀█░░░█░█░█▀█░█░█
░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀▀▀░▀▀▀░▀░▀░▀▀░░▀▀▀░▀░▀░▀░▀░░░▀▀▀░▀░▀░▀▀▀
  </pre>
  <strong>Calculadora de campanha WiBX para UAU</strong>
</p>

> Uma ferramenta para análise de capacidade de campanhas WiBX, permitindo converter compras em pontos UAU com precisão cirúrgica.

**Status:** Finished
**Ownership** : [Caio Maciel](https://github.com/kvag0), [Pedro Escaleira](https://github.com/EscaleiraP)

---

## ✨ Funcionalidades

- **OCR Inteligente**: Extração automática de cotação, quantidade e valor total a partir de screenshots de compra da WiBX.
- **Entrada Dupla**: Suporte para upload de imagem ou entrada manual de dados para simulações rápidas.
- **Cálculo de Capacidade**: Lógica reversa que considera a taxa da plataforma (3.5%) e o preço fixo do ponto UAU (R$ 0,0285).
- **Tabela de Referência**: Geração dinâmica de custos para diferentes tiers de pontos (50 a 50.000 pontos).
- **Relatórios Profissionais**: Exportação de relatório em PDF otimizado para impressão com timestamp de geração.

## 🛠️ Tecnologias Utilizadas

- **HTML5 / CSS3**: Design premium em Dark Mode com foco em UX.
- **JavaScript (Vanilla)**: Lógica de cálculo e manipulação de DOM sem dependências pesadas.
- **Tesseract.js**: Processamento de OCR diretamente no navegador (privacidade total, os dados não saem do client).
- **Google Fonts**: Tipografia moderna usando _Red Hat Display_.

## 🚀 Como Executar

O projeto é 100% client-side. Para rodar:

1. Clone o repositório ou baixe os arquivos.
2. Abra o arquivo `calculadora-wibx-uau.html` em qualquer navegador moderno (Chrome, Edge, Safari ou Firefox).
3. Certifique-se de estar conectado à internet no primeiro carregamento para que o navegador possa baixar o motor do Tesseract.js via CDN.

## 📊 Regras de Negócio

- **Preço do Ponto UAU**: Fixo em **R$ 0,0285**.
- **Taxa da Plataforma**: **3.5%** aplicada sobre a quantidade de WiBX.
- **Lógica**: O sistema calcula quantos pontos UAU podem ser distribuídos garantindo que a taxa da plataforma seja coberta sem reduzir o valor entregue ao usuário final.

---

<p align="center">
  <strong>Built and maintained by the Wibx Labs team. Internal use only.</strong>
</p>
