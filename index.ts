/**
 * Публичная точка входа пакета @joingonka/n8n-nodes-joingonka.
 *
 * n8n находит credentials и nodes через поле "n8n" в package.json
 * и напрямую реэкспорт здесь не требует. Тем не менее, package.json указывает
 * "main": "index.js", поэтому нужен валидный TS-файл для компиляции.
 */
export { JoinGonkaApi } from './credentials/JoinGonkaApi.credentials';
export { JoinGonka } from './nodes/JoinGonka/JoinGonka.node';
