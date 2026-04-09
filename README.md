# @joingonka/n8n-nodes-joingonka

n8n community node for [JoinGonka](https://gate.joingonka.ai), an OpenAI-compatible API gateway to the Gonka Network decentralized AI inference protocol.

Use decentralized AI models inside your n8n workflows with a familiar OpenAI-style API. Pay in USD/USDT through the gateway, no GNK tokens or crypto wallet required.

## Install

Inside your self-hosted n8n instance:

1. Open **Settings → Community Nodes**.
2. Click **Install a community node**.
3. Enter `@joingonka/n8n-nodes-joingonka` and confirm.
4. Restart n8n if prompted.

## First check: List Models

1. Add a **JoinGonka** node to a new workflow.
2. Click **Create new credential**, paste your API key (format `jg-...`). Get one at [gate.joingonka.ai](https://gate.joingonka.ai).
3. Set **Operation** to `List Models` and execute the node.
4. You should see a list of available models from Gonka Network.

## Chat Completion example

1. Add a **JoinGonka** node.
2. Set **Operation** to `Chat Completion`.
3. Set **Model** to `Qwen/Qwen3-235B-A22B-Instruct-2507-FP8` (default).
4. In **Messages**, enter:
   ```json
   [{"role":"user","content":"Say hello"}]
   ```
5. Optionally adjust **Temperature** (default 0.7) and **Max Tokens** (default 1024).
6. Execute. You should get back an OpenAI-format chat completion payload.

## Credentials

Just one field: **API Key**. The node sends it as `Authorization: Bearer <key>` to `https://gate.joingonka.ai/v1` (hardcoded base URL).

## License

Apache-2.0

Link: https://gate.joingonka.ai
