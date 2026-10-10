// Generated from openapi.yaml. Do not edit.
export interface paths {
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Verifica a disponibilidade do Sentry */
        get: operations["getHealth"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/cities": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lista configurações públicas de cidade */
        get: operations["listCities"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/posts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lista matérias publicadas */
        get: operations["listPosts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getMe"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/provider-connections/twitch/authorize": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["authorizeTwitch"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/provider-connections/twitch/callback": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["completeTwitchAuthorization"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/provider-connections/twitch": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getTwitchConnection"];
        put?: never;
        post?: never;
        delete: operations["disconnectTwitch"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/channels": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listMonitoringChannels"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/channels/{id}/monitoring": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["setChannelMonitoring"];
        trace?: never;
    };
    "/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listMonitoringSessions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getMonitoringSession"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sessions/{id}/invites": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listSessionInvites"];
        put?: never;
        post: operations["createSessionInvite"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/invites/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["revokeSessionInvite"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/invites/accept": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["acceptSessionInvite"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        ApiError: {
            code: string;
            message: string;
            /** Format: uuid */
            requestId: string;
        };
        Me: {
            /** Format: uuid */
            userId: string;
            /** @enum {string} */
            role: "member" | "vpn_admin";
        };
        TwitchConnection: {
            /** Format: uuid */
            id: string;
            /** @constant */
            provider: "twitch";
            providerUserId: string;
            login: string;
            /** @enum {string} */
            status: "connected" | "expired" | "revocation_pending" | "revoked";
            monitoringEnabled: boolean;
            /** @description Permite nova autorização com consentimento explícito, sem confirmar revogação remota anterior. */
            canReconnect: boolean;
            /** @constant */
            consentVersion: "monitoring-v1";
            /** Format: date-time */
            consentedAt: string;
            /** Format: date-time */
            connectedAt: string;
            /** Format: date-time */
            revokedAt: string | null;
        };
        MonitoringChannel: {
            /** Format: uuid */
            id: string;
            login: string;
            providerUserId: string;
            /** @enum {string} */
            connectionStatus: "connected" | "expired" | "revocation_pending" | "revoked";
            monitoringEnabled: boolean;
            consentVersion: string | null;
            /** @enum {string|null} */
            subscriptionStatus: "enabled" | "pending" | "error" | "null" | null;
        };
        MonitoringSession: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            channelId: string;
            streamId: string;
            title: string;
            category: string | null;
            /** Format: date-time */
            startedAt: string;
            /** Format: date-time */
            endedAt: string | null;
            canManageInvites: boolean;
        };
        MonitoringSessionPage: {
            items: components["schemas"]["MonitoringSession"][];
            nextCursor: string | null;
        };
        AccessInvite: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            sessionId: string;
            /** Format: date-time */
            expiresAt: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            revokedAt: string | null;
            /** Format: date-time */
            acceptedAt: string | null;
        };
        InviteCreated: {
            invite: components["schemas"]["AccessInvite"];
            token: string;
        };
        HealthResponse: {
            /** @enum {string} */
            status: "ok";
            /** @example vpn-sentry */
            service: string;
        };
        CityConfig: {
            slug: string;
            cidade_nome: string;
            jornal_nome: string;
            jornal_sigla: string;
            cor_primaria: string;
            logo_url: string | null;
        };
        Post: {
            id: number;
            title: string;
            body: string;
            cidade: string;
            cover_url: string;
            media_url: string | null;
            media_type: string | null;
            destaque: boolean;
            /** Format: date-time */
            published_at: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getHealth: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Serviço disponível */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthResponse"];
                };
            };
        };
    };
    listCities: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Cidades */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CityConfig"][];
                };
            };
        };
    };
    listPosts: {
        parameters: {
            query?: {
                cidade?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Matérias */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Post"][];
                };
            };
        };
    };
    getMe: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Solicitação concluída */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Me"];
                };
            };
            /** @description Solicitação não concluída */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Solicitação não concluída */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    authorizeTwitch: {
        parameters: {
            query?: never;
            header: {
                "X-OAuth-Nonce": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @constant */
                    consentVersion: "monitoring-v1";
                    /** @constant */
                    consentAccepted: true;
                };
            };
        };
        responses: {
            /** @description Solicitação concluída */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: uri */
                        authorizationUrl: string;
                    };
                };
            };
            /** @description Solicitação não concluída */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Solicitação não concluída */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Solicitação não concluída */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Solicitação não concluída */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    completeTwitchAuthorization: {
        parameters: {
            query: {
                code?: string;
                state: string;
                error?: string;
            };
            header: {
                "X-OAuth-Nonce": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Retorno fixo ao Monitor */
            303: {
                headers: {
                    Location?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Solicitação não concluída */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Solicitação não concluída */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Solicitação não concluída */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Solicitação não concluída */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    getTwitchConnection: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Solicitação concluída */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TwitchConnection"] | null;
                };
            };
            /** @description Solicitação não concluída */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Solicitação não concluída */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    disconnectTwitch: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Solicitação concluída */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @constant */
                        status: "revocation_pending";
                    };
                };
            };
            /** @description Desconectado */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Solicitação não concluída */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Solicitação não concluída */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    listMonitoringChannels: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Canais monitoráveis */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MonitoringChannel"][];
                };
            };
        };
    };
    setChannelMonitoring: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    enabled: boolean;
                    /** @constant */
                    consentVersion?: "monitoring-v2";
                    /** @constant */
                    consentAccepted?: true;
                };
            };
        };
        responses: {
            /** @description Estado de monitoramento atualizado */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MonitoringChannel"];
                };
            };
        };
    };
    listMonitoringSessions: {
        parameters: {
            query?: {
                channelId?: string;
                cursor?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sessões autorizadas */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MonitoringSessionPage"];
                };
            };
        };
    };
    getMonitoringSession: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sessão autorizada */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MonitoringSession"];
                };
            };
        };
    };
    listSessionInvites: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Convites sem token */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccessInvite"][];
                };
            };
        };
    };
    createSessionInvite: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Token de uso único */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InviteCreated"];
                };
            };
        };
    };
    revokeSessionInvite: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Convite revogado */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    acceptSessionInvite: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    token: string;
                };
            };
        };
        responses: {
            /** @description Convite consumido */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: uuid */
                        sessionId: string;
                    };
                };
            };
        };
    };
}
