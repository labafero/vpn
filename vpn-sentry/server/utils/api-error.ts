import { randomUUID } from 'node:crypto'
import { setHeader, setResponseStatus, type H3Event } from 'h3'
import type { ApiError } from '@vpn/contracts'

const messages = {
  400: ['INVALID_REQUEST', 'Solicitação inválida. Inicie a conexão novamente.'],
  401: ['UNAUTHORIZED', 'Entre na sua conta VPN para continuar.'],
  409: ['CONNECTION_CONFLICT', 'Desconecte o vínculo existente antes de conectar outro canal.'],
  503: ['SERVICE_UNAVAILABLE', 'Serviço temporariamente indisponível. Tente novamente.']
} as const

export class FoundationError extends Error {
  constructor(public statusCode: 400 | 401 | 409 | 503) {
    super(messages[statusCode][1])
  }
}

export function toApiError(error: unknown, requestId: string): ApiError {
  const status = error instanceof FoundationError ? error.statusCode : 503
  const [code, message] = messages[status]
  return { code, message, requestId }
}

export async function privateResponse<T>(event: H3Event, operation: () => Promise<T>): Promise<T | ApiError> {
  setHeader(event, 'Cache-Control', 'no-store')
  try { return await operation() } catch (error) {
    setResponseStatus(event, error instanceof FoundationError ? error.statusCode : 503)
    return toApiError(error, randomUUID())
  }
}
