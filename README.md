# GSpeech - Extensão Chrome Gemini TTS

Uma extensão poderosa para Google Chrome que converte texto selecionado em fala natural usando a API `gemini-2.5-flash-preview-tts` do Google, agora integrada ao Painel Lateral do navegador para uma experiência contínua.

## ✨ Funcionalidades

- **Painel Lateral Persistente**: A extensão agora roda no sidebar do Chrome, permitindo que você navegue e selecione textos sem fechar a interface.
- **Leitura Natural (TTS)**: Utiliza a IA do Gemini para gerar falas extremamente naturais e expressivas.
- **Tradução Automática Configurável**:
  - Se o texto selecionado estiver em inglês, a extensão traduz para Português.
  - **Novo**: Configure se deseja **"Traduzir e Ouvir"** (padrão) ou **"Apenas Traduzir"** (ideal para economizar tempo).
- **Seleção de Vozes**: Escolha entre diversas personalidades de voz do Gemini (Zephyr, Puck, Aoede, etc.).
- **Temas**: Suporte a tema Claro, Escuro e Automático (Seguindo o sistema).
- **Captura Inteligente**:
  - Selecione um texto e abra a extensão para capturar.
  - Já com a extensão aberta, selecione um novo texto e clique em **"Ouvir"** para atualizar e ler imediatamente.
- **Player de Áudio Dedicado**: Controles visuais de reprodução (Play, Pause, Volume, Barra de progresso).
- **Persistência**: Lembra suas configurações, último texto lido e tradução mesmo após fechar o navegador.

## 🚀 Como Instalar

1. Clone ou baixe este repositório.
2. Abra o Chrome e acesse `chrome://extensions`.
3. Ative o **Modo do desenvolvedor** no canto superior direito.
4. Clique em **Carregar sem compactação** (Load unpacked).
5. Selecione a pasta onde você salvou este projeto (`/gspeech`).

## ⚙️ Configuração

Para usar a extensão, você precisará de uma chave de API do Google Gemini gratuita:

1. Obtenha sua chave em [Google AI Studio](https://aistudio.google.com/).
2. Clique no ícone da extensão **GSpeech** na barra de ferramentas (Isso abrirá o Painel Lateral).
3. No topo do painel, clique no ícone de **engrenagem (Configurações)**.
4. Cole sua **Gemini API Key**.
5. (Opcional) Escolha sua voz preferida e idioma padrão.
6. **(Novo) Comportamento para Inglês**: Escolha se deseja ouvir o áudio após a tradução ou apenas ler o texto traduzido.
7. Clique em **Salvar**.

## 🖥️ Como Usar

1. **Abra o Painel**: Clique no ícone da extensão para abrir o sidebar à direita.
2. **Selecione e Ouça**:
   - Selecione qualquer texto em uma página da web.
   - Clique no botão **Ouvir**.
   - A extensão buscará o texto selecionado, traduzirá (se necessário) e começará a falar.
3. **Dinâmica Contínua**:
   - Enquanto ouve, você pode rolar a página e selecionar outro parágrafo.
   - Basta clicar em **Ouvir** novamente para substituir o texto atual pelo novo e reiniciar a leitura.

## 🛠️ Tecnologias

- **Chrome Extension Manifest V3**
- **Side Panel API**: Para uma interface integrada e persistente.
- **Gemini API**:
  - `gemini-2.5-flash`: Para traduções rápidas e precisas.
  - `gemini-2.5-flash-preview-tts`: Para síntese de voz de última geração.
- **Background Service Worker**: Gerenciamento de tarefas pesadas em segundo plano.
- **CSS Responsivo**: Interface adaptável que preenche 100% da altura do painel.

## 📝 Licença

Este projeto é de código aberto e está disponível para uso pessoal e educacional.
