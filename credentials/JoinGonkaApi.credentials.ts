/**
 * JoinGonka API credential для n8n.
 *
 * Реализует ICredentialType. Используется нодой JoinGonka для авторизации
 * запросов к https://gate.joingonka.ai/v1 через заголовок Authorization: Bearer.
 *
 * Ключ формата jg-* выдаётся на https://gate.joingonka.ai
 */
import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class JoinGonkaApi implements ICredentialType {
  // Уникальное имя credential, на которое ссылаются ноды
  name = 'joinGonkaApi';

  // Имя, которое пользователь видит в UI n8n
  displayName = 'JoinGonka API';

  // Ссылка на документацию (кнопка "Learn more" в UI)
  documentationUrl = 'https://gate.joingonka.ai';

  // Единственное поле — API-ключ
  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      placeholder: 'jg-...',
      required: true,
      description:
        'JoinGonka API key. Get one at https://gate.joingonka.ai (format: jg-xxxxxxxx).',
    },
  ];

  // Универсальная аутентификация: n8n сам подставит Bearer-токен
  // во все исходящие запросы этой credential.
  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.apiKey}}',
      },
    },
  };

  // Кнопка "Test credential" дёргает GET /v1/models.
  // 200 OK — credential валидна.
  test: ICredentialTestRequest = {
    request: {
      baseURL: 'https://gate.joingonka.ai',
      url: '/v1/models',
      method: 'GET',
    },
  };
}
