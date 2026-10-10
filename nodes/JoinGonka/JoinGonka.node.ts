/**
 * JoinGonka — n8n community node для работы с OpenAI-совместимым API гейтвея
 * https://gate.joingonka.ai/v1 (прокси к Gonka Network).
 *
 * Две операции:
 *   - listModels     — GET /v1/models
 *   - chatCompletion — POST /v1/chat/completions
 *
 * Аутентификация: credential JoinGonkaApi (Bearer-токен).
 */
import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeConnectionType,
  NodeOperationError,
  NodeApiError,
  IHttpRequestOptions,
  JsonObject,
  IDataObject,
} from 'n8n-workflow';

// --- Константы ---

/** Base URL гейтвея, по заданию — захардкожен. */
const GATEWAY_BASE_URL = 'https://gate.joingonka.ai/v1';

// --- Определение ноды ---

export class JoinGonka implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'JoinGonka',
    name: 'joinGonka',
    // Иконка SVG лежит рядом с файлом ноды
    icon: 'file:joingonka.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Interact with JoinGonka Gateway API',
    defaults: {
      name: 'JoinGonka',
    },
    // Используем строковые литералы 'main' вместо NodeConnectionType.Main:
    // это совместимо с любыми версиями n8n-workflow, где enum мог отсутствовать.
    inputs: ['main'] as unknown as NodeConnectionType[],
    outputs: ['main'] as unknown as NodeConnectionType[],
    credentials: [
      {
        name: 'joinGonkaApi',
        required: true,
      },
    ],
    properties: [
      // --- Выбор операции ---
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Chat Completion',
            value: 'chatCompletion',
            description: 'Run a chat completion against JoinGonka Gateway',
            action: 'Run a chat completion',
          },
          {
            name: 'List Models',
            value: 'listModels',
            description: 'Get the list of available models from the gateway',
            action: 'List available models',
          },
        ],
        default: 'chatCompletion',
      },

      // --- Поля Chat Completion ---
      {
        displayName: 'Model',
        name: 'model',
        type: 'string',
        // Умолчания-идентификатора НЕТ намеренно: состав моделей сети меняется голосованием,
        // и зашитый id однажды перестаёт существовать (в 0.1.0 здесь стояла Qwen3, ушедшая
        // из сети в июне 2026, — нода «из коробки» отвечала 400 Model not found). Пустое
        // поле = модель шлюза по умолчанию: поле model в запрос не попадает.
        default: '',
        placeholder: 'empty = gateway default model',
        displayOptions: {
          show: {
            operation: ['chatCompletion'],
          },
        },
        description:
          "Model identifier from the List Models operation. Leave empty to use the gateway's current default model — the set of models on the network changes over time.",
      },
      {
        displayName: 'Messages',
        name: 'messages',
        type: 'json',
        default: '[{"role":"user","content":"Hello"}]',
        required: true,
        displayOptions: {
          show: {
            operation: ['chatCompletion'],
          },
        },
        description:
          'Array of chat messages in OpenAI format. Each message must have "role" (system/user/assistant) and "content".',
      },
      {
        displayName: 'Temperature',
        name: 'temperature',
        type: 'number',
        typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 2 },
        default: 0.7,
        displayOptions: {
          show: {
            operation: ['chatCompletion'],
          },
        },
        description: 'Sampling temperature (0 = deterministic, 2 = very creative)',
      },
      {
        displayName: 'Max Tokens',
        name: 'maxTokens',
        type: 'number',
        typeOptions: { minValue: 1 },
        default: 1024,
        displayOptions: {
          show: {
            operation: ['chatCompletion'],
          },
        },
        description: 'Maximum number of tokens to generate',
      },
    ],
  };

  /**
   * Основной метод исполнения ноды.
   * Обрабатывает каждый входной item по отдельности: для listModels делает
   * GET /v1/models, для chatCompletion — POST /v1/chat/completions.
   */
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    // Получаем credential один раз на весь execute-цикл.
    // this.getCredentials даёт доступ к apiKey, который затем ставим в Bearer.
    const credentials = (await this.getCredentials('joinGonkaApi')) as {
      apiKey: string;
    };

    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;

        if (operation === 'listModels') {
          // GET /v1/models — получаем список моделей в OpenAI-формате.
          const options: IHttpRequestOptions = {
            method: 'GET',
            url: `${GATEWAY_BASE_URL}/models`,
            headers: {
              Authorization: `Bearer ${credentials.apiKey}`,
              Accept: 'application/json',
            },
            json: true,
          };

          const response = (await this.helpers.httpRequest(options)) as JsonObject;

          returnData.push({
            json: response,
            pairedItem: { item: i },
          });
        } else if (operation === 'chatCompletion') {
          // Читаем параметры ноды.
          const model = ((this.getNodeParameter('model', i, '') as string) ?? '').trim();
          const messagesRaw = this.getNodeParameter('messages', i) as string | IDataObject[];
          const temperature = this.getNodeParameter('temperature', i, 0.7) as number;
          const maxTokens = this.getNodeParameter('maxTokens', i, 1024) as number;

          // Поле "messages" может прийти либо JSON-строкой (из UI),
          // либо массивом объектов (из expression). Приводим к массиву.
          let messages: unknown[];
          if (typeof messagesRaw === 'string') {
            try {
              messages = JSON.parse(messagesRaw);
            } catch (err) {
              throw new NodeOperationError(
                this.getNode(),
                `Messages field must be valid JSON: ${(err as Error).message}`,
                { itemIndex: i },
              );
            }
          } else {
            messages = messagesRaw as unknown[];
          }

          if (!Array.isArray(messages) || messages.length === 0) {
            throw new NodeOperationError(
              this.getNode(),
              'Messages must be a non-empty array of { role, content } objects',
              { itemIndex: i },
            );
          }

          // Собираем тело запроса в формате OpenAI Chat Completions.
          // Пустая модель в запрос не идёт — шлюз подставит свою модель по умолчанию.
          const body: JsonObject = {
            ...(model ? { model } : {}),
            messages: messages as JsonObject[],
            temperature,
            max_tokens: maxTokens,
          };

          const options: IHttpRequestOptions = {
            method: 'POST',
            url: `${GATEWAY_BASE_URL}/chat/completions`,
            headers: {
              Authorization: `Bearer ${credentials.apiKey}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body,
            json: true,
          };

          const response = (await this.helpers.httpRequest(options)) as JsonObject;

          returnData.push({
            json: response,
            pairedItem: { item: i },
          });
        } else {
          throw new NodeOperationError(
            this.getNode(),
            `Unknown operation: ${operation}`,
            { itemIndex: i },
          );
        }
      } catch (error) {
        // Стандартный n8n-паттерн: если пользователь включил Continue On Fail —
        // кладём ошибку в payload и продолжаем цикл, а не валим весь воркфлоу.
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: (error as Error).message,
            },
            pairedItem: { item: i },
          });
          continue;
        }

        if (error instanceof NodeOperationError) {
          throw error;
        }
        throw new NodeApiError(this.getNode(), error as JsonObject, {
          itemIndex: i,
        });
      }
    }

    return [returnData];
  }
}
