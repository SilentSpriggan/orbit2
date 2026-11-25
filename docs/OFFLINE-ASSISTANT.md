# Running the offline voice assistant

The offline crew voice assistant runs entirely on one computer. Once it is set up, it needs no internet: speech recognition, the language model and the voice all run locally.

| Part | What it does | Runs in | Model | Download |
|---|---|---|---|---|
| Voice activity detection | Notices when you start and stop talking | Python server (Pipecat) | Silero VAD | Included with Pipecat |
| Speech to text | Turns your speech into text | Python server | faster-whisper `base.en` (CPU, int8) | about 140 MB, from Hugging Face |
| Language model | Writes the reply and calls the website's tools | [Ollama](https://ollama.com) | `qwen3:8b` | about 5.2 GB |
| Text to speech | Speaks the reply | Python server | Kokoro v1.0 (ONNX) | about 355 MB (`kokoro-v1.0.onnx` 325 MB + `voices-v1.0.bin` 28 MB), from GitHub |
| Website | The ORBIT site and the assistant panel | Node (`scripts/serve-ui.mjs`) | – | – |

The same Ollama model also answers **Ask the onboard library** on the Offline Evidence Library page.

How a turn flows: the browser sends your microphone over WebRTC to the server → Silero hears you stop → after 1 second of silence, faster-whisper transcribes → Ollama `qwen3:8b` replies, searching the Evidence library and using the website's tools where needed → Kokoro speaks the reply back over WebRTC.

## What you need

- **Node.js and npm** (current LTS or newer).
- **Python 3.12.** The server is tested on 3.12.
- **Ollama.** On Windows and macOS, use the installer from https://ollama.com/download.
- **About 6 GB of free disk space** for the models, plus the Python packages.
- **A microphone.** Browsers only allow the microphone on `localhost` or over HTTPS.

You need internet **once**, for the setup steps below. After that, everything runs offline.

## One-time setup (with internet)

Run these from the project folder (the one containing `package.json`).

### 1. Website dependencies

```bash
npm ci
```

### 2. Python environment

Windows (PowerShell):

```powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r server/requirements.txt
```

macOS / Linux:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r server/requirements.txt
```

This installs Pipecat with the Silero, Whisper, Kokoro, Ollama and WebRTC extras, plus FastAPI and Uvicorn.

### 3. The language model

Start Ollama (it runs in the background after installing), then:

```bash
ollama pull qwen3:8b
ollama list          # qwen3:8b should be listed
```

Ollama uses your GPU automatically if it has one, and otherwise runs on the CPU.

### 4. The speech models (Whisper and Kokoro)

The server never downloads anything unless you allow it. To fetch the speech models the first time:

1. Copy `server/.env.example` to `server/.env`.
2. Add this line to `server/.env`:
   ```
   ORBIT_ALLOW_DOWNLOADS=1
   ```
3. Start everything (see **Running it** below), open the offline assistant and press **Start session** once. The server downloads Whisper `base.en` into the Hugging Face cache (`~/.cache/huggingface/hub`) and the two Kokoro files into `~/.cache/pipecat/kokoro-onnx`.
4. When the session has spoken to you, stop the server and **remove** the `ORBIT_ALLOW_DOWNLOADS=1` line. From now on it runs offline.

If you already have the Kokoro files somewhere, point the server at them in `server/.env` instead of downloading:

```
ORBIT_KOKORO_MODEL=C:\path\to\kokoro-v1.0.onnx
ORBIT_KOKORO_VOICES=C:\path\to\voices-v1.0.bin
```

## Running it

You need three things running: Ollama, the Python server and the website.

**Terminal 1: the Python server** (with the virtual environment activated)

```bash
npm run server
```

It starts on **https://localhost:8443** and creates a self-signed certificate the first time (`server/certs/`).

**Terminal 2: the website**

```bash
npm run dev
```

This builds the site and serves it at **http://localhost:5173**. It forwards the assistant's `/api` requests to the Python server on port 8443.

**Ollama** should already be running in the background. If it isn't, start the Ollama app or run `ollama serve`.

Then:

1. Open **http://localhost:5173**.
2. Click the **Wi-Fi icon** next to the microphone in the Crew Assistant panel on the right. This opens the **offline** assistant. The microphone icon next to it is the online ElevenLabs assistant.
3. Press **Start session**, allow the microphone, and talk. You can also type in the box below the transcript.

The offline panel stays open while you change pages, so you can ask it to open pages or fill in forms.

### Using it from another device on the same network

Run `npm run build`, then open **https://\<this computer's IP\>:8443** on the other device. The server prints its LAN address when it starts. Accept the self-signed certificate warning once. HTTPS is required there, because browsers block the microphone on plain HTTP addresses other than `localhost`.

## Checking that everything is ready

With the server running, open these in a browser and accept the certificate warning if asked:

- **https://localhost:8443/api/voice/config**: `pipelineHealth` should show `"stt":"ready","llm":"ready","tts":"ready"`.
- **https://localhost:8443/api/system/status**: `ollama.state` should be `"ready"` with `"model":"qwen3:8b"`.

| Shows `unavailable` | Cause | Fix |
|---|---|---|
| `stt` | Whisper model not downloaded | Do setup step 4 |
| `tts` | Kokoro files not found | Do setup step 4, or set `ORBIT_KOKORO_MODEL` / `ORBIT_KOKORO_VOICES` |
| `llm` / `ollama` | Ollama not running, or the model is missing | Start Ollama; run `ollama pull qwen3:8b` |

## Settings (`server/.env`)

All settings are optional. See `server/.env.example`.

| Setting | Default | What it does |
|---|---|---|
| `ORBIT_PORT` | `8443` | Server port |
| `ORBIT_OLLAMA_URL` | `http://localhost:11434` | Where Ollama is listening |
| `ORBIT_LLM_MODEL` | `qwen3:8b` | Ollama model for the assistant and the onboard library |
| `ORBIT_STT_MODEL` | `base.en` | Whisper model. `small.en` is more accurate but about 2 s slower per turn on a CPU |
| `ORBIT_KOKORO_MODEL` / `ORBIT_KOKORO_VOICES` | Pipecat cache | Paths to the Kokoro files |
| `ORBIT_SILENCE_SECONDS` | `1.0` | Seconds of silence before the assistant replies |
| `ORBIT_ALLOW_DOWNLOADS` | unset | Set to `1` only while downloading models |

If you change `ORBIT_STT_MODEL` or `ORBIT_LLM_MODEL`, download the new model first: repeat setup step 4 for Whisper, or run `ollama pull <model>`.

In the assistant's **Voice settings** you can change the voice (eight English voices, US and UK), the speed, the reply length and the microphone sensitivity. These are saved to `server/data/runtime/voice_settings.json`.

## Going fully offline

1. Do the one-time setup above while you have internet.
2. On the website, press **Prepare offline package** on the Offline Evidence Library page. This caches the app, the evidence library and the anatomy models in the browser.
3. Switch the top bar to **Offline**. The online ElevenLabs assistant and external links turn off; the offline assistant, Evidence library, Anatomy lab and health records keep working.

SCOPE photo analysis needs internet (it uses Gemini; see `docs/SCOPE-SETUP.md`) and is not part of the offline assistant.

## Troubleshooting

- **The browser says "Not secure" or warns about the certificate.** This is expected: the server uses a self-signed certificate. Accept it once.
- **The first reply is slow.** The server loads `qwen3:8b` and pre-processes the prompt when a session starts. Later replies are faster, and Ollama keeps the model loaded for 30 minutes.
- **"Checking the local model…" never finishes, or the session will not start.** Make sure the Python server is running (terminal 1) and that `/api/voice/config` shows everything ready.
- **The assistant cannot hear you.** Check the microphone choice under the push-to-talk controls, and that the browser has microphone permission for the site.
- **Port 8443 is already in use.** Another server copy is still running. Close it, or set `ORBIT_PORT` in `server/.env`.
- **Errors mentioning Hugging Face or "offline mode" when the server starts a session.** A speech model is missing while downloads are off. Do setup step 4.

## Where things are

| Path | What it is |
|---|---|
| `server/run.py` | Starts the server over HTTPS |
| `server/orbit_server/voice.py` | The voice pipeline and the assistant's instructions |
| `server/orbit_server/tools.py` | Tools the model can call (open pages and forms, fill in forms, log vitals, search evidence) |
| `server/orbit_server/store.py` | Crew data and Evidence library search |
| `server/orbit_server/config.py` | Settings read from `server/.env` |
| `server/data/research-library.json` | The Evidence library the assistant searches (exported from `ui/research-library.js` by `npm run build`) |
| `server/data/runtime/` | Saved vitals and voice settings (not committed) |
