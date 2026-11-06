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
    "/me/openai-credential": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getOpenAiCredentialStatus"];
        put?: never;
        post: operations["saveOpenAiCredential"];
        delete: operations["deleteOpenAiCredential"];
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
    "/channels/{id}/clip-consent": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getClipConsent"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["setClipConsent"];
        trace?: never;
    };
    "/channels/{id}/clips": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listClips"];
        put?: never;
        post: operations["submitClip"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/channels/{id}/clips/{submissionId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["getClipDetail"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch: operations["setClipEvidenceApproval"];
        trace?: never;
    };
    "/channels/{id}/clips/{submissionId}/retry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["beginClipManualRetry"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/channels/{id}/clips/{submissionId}/retry/captions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["completeClipManualRetryWithCaptions"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/channels/{id}/clips/{submissionId}/retry/openai": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["fallbackClipManualRetryToOpenAi"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/channels/{id}/trigger-phrases": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["listClipTriggerPhrases"];
        put?: never;
        post: operations["createClipTriggerPhrase"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/channels/{id}/trigger-phrases/{phraseId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete: operations["deactivateClipTriggerPhrase"];
        options?: never;
        head?: never;
        patch: operations["updateClipTriggerPhrase"];
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
        /**
         * @description clip_create é reservado à captura agendada, ainda indisponível.
         * @enum {string}
         */
        ClipCapability: "clip_download" | "clip_create";
        ClipConsent: {
            manualEnabled: boolean;
            /** @enum {string|null} */
            consentVersion: "clip-processing-v1" | null;
            /** Format: date-time */
            consentedAt: string | null;
            /** Format: date-time */
            revokedAt: string | null;
            scheduledEnabled: boolean;
            /** @enum {string|null} */
            scheduledConsentVersion: "clip-scheduled-v1" | null;
            /** Format: date-time */
            scheduledConsentedAt: string | null;
            /** Format: date-time */
            scheduledRevokedAt: string | null;
            canDownload: boolean;
        };
        ClipConsentRequest: {
            /** @constant */
            manualEnabled: true;
            /** @constant */
            consentVersion: "clip-processing-v1";
            /** @constant */
            consentAccepted: true;
        } | {
            /** @constant */
            manualEnabled: false;
        } | {
            /** @constant */
            scheduledEnabled: true;
            /** @constant */
            scheduledConsentVersion: "clip-scheduled-v1";
            /** @constant */
            scheduledConsentAccepted: true;
        } | {
            /** @constant */
            scheduledEnabled: false;
        };
        ClipTriggerPhrase: {
            /** Format: uuid */
            id: string;
            text: string;
            version: number;
            enabled: boolean;
        };
        ClipTriggerPhraseRequest: {
            text: string;
        };
        ClipTriggerPhraseUpdate: {
            text?: string;
            enabled?: boolean;
        };
        ClipDetail: components["schemas"]["ClipSubmissionRecord"];
        ClipEvidenceApprovalRequest: {
            approved: boolean;
        };
        ClipEvidenceApproval: {
            /** Format: date-time */
            approvedAt: string | null;
        };
        ClipManualRetry: {
            /** @enum {string} */
            state: "processing" | "pending_captions" | "needs_trigger_phrases";
            /** @enum {string} */
            mode: "captions" | "openai" | "none";
            /** Format: uuid */
            retryToken: string | null;
            videoId: string | null;
            vodOffset: number | null;
            durationSeconds: number | null;
        };
        ClipManualRetryTokenRequest: {
            /** Format: uuid */
            retryToken: string;
        };
        ClipManualRetrySegment: {
            startMs: number;
            endMs: number;
            text: string;
        };
        ClipManualRetryCaptionsRequest: {
            /** Format: uuid */
            retryToken: string;
            segments: components["schemas"]["ClipManualRetrySegment"][];
        };
        ClipManualRetryResult: {
            /** @enum {string} */
            state: "completed" | "no_match" | "needs_trigger_phrases" | "cancelled_consent" | "pending_captions";
            matches: number;
        };
        ClipSubmissionRequest: {
            /** Format: uri */
            url: string;
        };
        ClipSubmission: {
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            state: "pending_metadata" | "pending_captions" | "waiting_capacity" | "needs_trigger_phrases" | "needs_openai_key" | "processing" | "completed" | "no_match" | "source_unavailable" | "failed_retryable" | "failed_terminal" | "cancelled_consent";
            duplicate: boolean;
        };
        ClipDetection: {
            phraseId: string;
            phraseVersion: number;
            phrase: string;
            /** @enum {string} */
            source: "captions" | "openai";
            startMs: number;
            endMs: number;
        };
        ClipSubmissionRecord: {
            /** Format: uuid */
            id: string;
            clipId: string;
            /** Format: uri */
            canonicalUrl: string;
            videoId: string | null;
            vodOffset: number | null;
            title: string | null;
            creatorId: string | null;
            /** Format: date-time */
            createdAt: string | null;
            durationSeconds: number | null;
            language: string | null;
            viewCount: number | null;
            /** @enum {string} */
            captureMode: "manual" | "scheduled";
            /** @enum {string} */
            state: "pending_metadata" | "pending_captions" | "waiting_capacity" | "needs_trigger_phrases" | "needs_openai_key" | "processing" | "completed" | "no_match" | "source_unavailable" | "failed_retryable" | "failed_terminal" | "cancelled_consent";
            /** @enum {string|null} */
            failureCode: "clip_unavailable" | "captions_unavailable" | "transcription_failed" | "quota_exceeded" | "unsupported_language" | "invalid_media" | "provider_error" | null;
            /** Format: date-time */
            receivedAt: string;
            /** Format: date-time */
            approvedAt: string | null;
            detections: components["schemas"]["ClipDetection"][];
        };
        ClipSubmissionList: {
            items: components["schemas"]["ClipSubmissionRecord"][];
            nextCursor: string | null;
        };
        OpenAiCredentialStatus: {
            configured: boolean;
            systemConfigured: boolean;
        };
        OpenAiCredentialUpdate: {
            apiKey: string;
        };
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
            evidence: components["schemas"]["SharedEvidenceClip"][];
        };
        SharedEvidenceClip: {
            /** Format: uuid */
            id: string;
            title: string | null;
            /** Format: uri */
            canonicalUrl: string;
            /** Format: date-time */
            createdAt: string;
            detections: components["schemas"]["ClipDetection"][];
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
    getOpenAiCredentialStatus: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Informa se o usuário configurou uma chave */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OpenAiCredentialStatus"];
                };
            };
            /** @description Não autenticado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    saveOpenAiCredential: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["OpenAiCredentialUpdate"];
            };
        };
        responses: {
            /** @description Chave armazenada de forma criptografada */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OpenAiCredentialStatus"];
                };
            };
            /** @description Chave inválida */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Não autenticado */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    deleteOpenAiCredential: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Chave removida */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OpenAiCredentialStatus"];
                };
            };
            /** @description Não autenticado */
            401: {
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
                } | {
                    /** @constant */
                    consentVersion: "clip-processing-v1";
                    /** @constant */
                    consentAccepted: true;
                    capabilities: components["schemas"]["ClipCapability"][];
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
    getClipConsent: {
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
            /** @description Operação privada concluída */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClipConsent"];
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
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Solicitação não concluída */
            404: {
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
    setClipConsent: {
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
                "application/json": components["schemas"]["ClipConsentRequest"];
            };
        };
        responses: {
            /** @description Operação privada concluída */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClipConsent"];
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
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Solicitação não concluída */
            404: {
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
    listClips: {
        parameters: {
            query?: {
                cursor?: string;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Clips e detecções mínimas do canal autorizado */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClipSubmissionList"];
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
            403: {
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
    submitClip: {
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
                "application/json": components["schemas"]["ClipSubmissionRequest"];
            };
        };
        responses: {
            /** @description Operação privada concluída */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClipSubmission"];
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
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Solicitação não concluída */
            404: {
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
    getClipDetail: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                submissionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Metadados e detecções do clip */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClipDetail"];
                };
            };
            /** @description Solicitação não concluída */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    setClipEvidenceApproval: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                submissionId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClipEvidenceApprovalRequest"];
            };
        };
        responses: {
            /** @description Aprovação atualizada */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClipEvidenceApproval"];
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
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Solicitação não concluída */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    beginClipManualRetry: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                submissionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Tentativa individual iniciada */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClipManualRetry"];
                };
            };
            /** @description Consentimento ou acesso indisponível */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Clip não encontrado */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Clip não elegível para retry */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Outro clip está em processamento */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    completeClipManualRetryWithCaptions: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                submissionId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClipManualRetryCaptionsRequest"];
            };
        };
        responses: {
            /** @description Captions analisadas sem persistir o texto integral */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClipManualRetryResult"];
                };
            };
            /** @description Captions inválidas */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Consentimento ou acesso indisponível */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Tentativa inválida ou expirada */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    fallbackClipManualRetryToOpenAi: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                submissionId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClipManualRetryTokenRequest"];
            };
        };
        responses: {
            /** @description Clip enfileirado para a transcrição OpenAI */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClipManualRetryResult"];
                };
            };
            /** @description Solicitação inválida */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Consentimento ou acesso indisponível */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Tentativa inválida ou expirada */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    listClipTriggerPhrases: {
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
            /** @description Frases configuradas para o canal */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClipTriggerPhrase"][];
                };
            };
        };
    };
    createClipTriggerPhrase: {
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
                "application/json": components["schemas"]["ClipTriggerPhraseRequest"];
            };
        };
        responses: {
            /** @description Frase configurada */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClipTriggerPhrase"];
                };
            };
        };
    };
    deactivateClipTriggerPhrase: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                phraseId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Frase desativada */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    updateClipTriggerPhrase: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
                phraseId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClipTriggerPhraseUpdate"];
            };
        };
        responses: {
            /** @description Frase atualizada */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClipTriggerPhrase"];
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
