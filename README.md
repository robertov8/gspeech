# GSpeech - Extensão Chrome Gemini TTS

Uma extensão simples e eficiente para Google Chrome que converte texto selecionado em áudio usando a poderosa API `gemini-2.5-flash-preview-tts` do Google.

## ✨ Funcionalidades

- **Seleção de Texto**: Selecione qualquer texto em uma página da web.
- **Leitura Inteligente**: Utiliza a IA do Gemini para gerar uma fala natural em Português (Brasil).
- **Interface Limpa**: Popup inspirado no design do Google/Material Design.
- **Reprodução Imediata**: Processamento rápido e reprodução de áudio diretamente no navegador.

## 🚀 Como Instalar

1. Clone ou baixe este repositório.
2. Abra o Chrome e acesse `chrome://extensions`.
3. Ative o **Modo do desenvolvedor** no canto superior direito.
4. Clique em **Carregar sem compactação** (Load unpacked).
5. Selecione a pasta onde você salvou este projeto (`/gspeech`).

## ⚙️ Configuração

Para usar a extensão, você precisará de uma chave de API do Google Gemini:

1. Obtenha sua chave em [Google AI Studio](https://aistudio.google.com/).
2. Clique no ícone da extensão **GSpeech** no Chrome.
3. Clique no ícone de **engrenagem (Configurações)**.
4. Cole sua API Key e clique em **Salvar**.

## 🖥️ Como Usar

1. Navegue até qualquer página da web.
2. Selecione o trecho de texto que deseja ouvir.
3. Clique no ícone da extensão.
4. O texto aparecerá na janela. Clique em **Ouvir**.

## 🛠️ Tecnologias

- **Manifest V3**: Padrão mais recente para extensões Chrome.
- **Gemini API**: Modelo `gemini-2.5-flash-preview-tts`.
- **JavaScript Moderno**: Async/Await, Fetch API.
- **Processamento de Áudio**: Conversão client-side de PCM para WAV para compatibilidade total com navegadores.

## 📝 Licença

Este projeto é de código aberto e está disponível para uso pessoal e educacional.
