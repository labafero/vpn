import type {
  OBSRequestTypes,
  OBSResponseTypes,
  OBSWebSocket,
} from "obs-websocket-js";

export type ObsConnectionStatus =
  | "desconectado"
  | "conectando"
  | "conectado"
  | "reconectando"
  | "erro";

export type ObsConnectionErrorKind =
  | "validation"
  | "authentication"
  | "unavailable"
  | "mixed-content"
  | "protocol"
  | "session-invalidated"
  | "reconnect-exhausted"
  | "unknown";

export type ObsConnectionError = {
  kind: ObsConnectionErrorKind;
  message: string;
};

export type ObsConnectionConfig = {
  host: string;
  port: number;
  password: string;
  rememberPassword: boolean;
};

export type ObsConnectionMetadata = {
  obsWebSocketVersion: string;
  negotiatedRpcVersion: number;
};

const STORAGE_KEY = "vpn:obs-connection";
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000] as const;

let client: OBSWebSocket | null = null;
let clientPromise: Promise<OBSWebSocket> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let connectionEpoch = 0;
let manuallyDisconnected = false;
let storageLoaded = false;

function errorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "number"
  ) {
    return error.code;
  }

  return null;
}

function connectionError(error: unknown): ObsConnectionError {
  switch (errorCode(error)) {
    case 4009:
      return {
        kind: "authentication",
        message: "A senha do OBS está incorreta.",
      };
    case 4010:
      return {
        kind: "protocol",
        message: "O OBS não oferece uma versão compatível do protocolo 5.x.",
      };
    case 4011:
      return {
        kind: "session-invalidated",
        message: "A sessão foi encerrada pelo OBS. Conecte novamente manualmente.",
      };
    case -1:
    case 1006:
      return {
        kind: "unavailable",
        message: "Não foi possível alcançar o OBS nesse endereço e porta.",
      };
    default:
      return {
        kind: "unknown",
        message: "Não foi possível estabelecer a conexão com o OBS.",
      };
  }
}

function validateConfig(config: ObsConnectionConfig): ObsConnectionError | null {
  const host = config.host.trim();

  if (
    !Number.isInteger(config.port) ||
    config.port < 1 ||
    config.port > 65535
  ) {
    return {
      kind: "validation",
      message: "A porta deve ser um número inteiro entre 1 e 65535.",
    };
  }

  if (
    !host ||
    host.includes("://") ||
    /[/?#\s]/.test(host) ||
    !URL.canParse(`ws://${host}:${config.port}`)
  ) {
    return {
      kind: "validation",
      message: "Informe um endereço válido, sem protocolo ou caminho.",
    };
  }

  return null;
}

function persistConfig(config: ObsConnectionConfig) {
  if (!import.meta.client) return;

  const storedConfig = {
    host: config.host.trim(),
    port: config.port,
    rememberPassword: config.rememberPassword,
    ...(config.rememberPassword ? { password: config.password } : {}),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedConfig));
  } catch {
    // A indisponibilidade do armazenamento local não deve impedir a conexão.
  }
}

function loadStoredConfig(config: Ref<ObsConnectionConfig>) {
  if (!import.meta.client || storageLoaded) return;
  storageLoaded = true;

  try {
    const rawConfig = localStorage.getItem(STORAGE_KEY);
    if (!rawConfig) return;

    const storedConfig = JSON.parse(rawConfig) as Partial<ObsConnectionConfig>;
    config.value = {
      host:
        typeof storedConfig.host === "string"
          ? storedConfig.host
          : config.value.host,
      port:
        typeof storedConfig.port === "number"
          ? storedConfig.port
          : config.value.port,
      password:
        storedConfig.rememberPassword &&
        typeof storedConfig.password === "string"
          ? storedConfig.password
          : "",
      rememberPassword: storedConfig.rememberPassword === true,
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function useObsConnection() {
  const user = useSupabaseUser();
  const status = useState<ObsConnectionStatus>(
    "obs-connection-status",
    () => "desconectado",
  );
  const error = useState<ObsConnectionError | null>(
    "obs-connection-error",
    () => null,
  );
  const config = useState<ObsConnectionConfig>("obs-connection-config", () => ({
    host: "127.0.0.1",
    port: 4455,
    password: "",
    rememberPassword: false,
  }));
  const metadata = useState<ObsConnectionMetadata | null>(
    "obs-connection-metadata",
    () => null,
  );
  const reconnectAttempt = useState("obs-reconnect-attempt", () => 0);

  loadStoredConfig(config);

  function clearReconnectTimer() {
    if (!reconnectTimer) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  function setError(nextError: ObsConnectionError) {
    error.value = nextError;
    status.value = "erro";
    metadata.value = null;
  }

  async function ensureClient() {
    if (!import.meta.client) return null;
    if (client) return client;
    if (clientPromise) return clientPromise;

    const pendingClient = import("obs-websocket-js").then(({ OBSWebSocket }) => {
      const obs = new OBSWebSocket();
      obs.on("ConnectionClosed", handleUnexpectedClose);

      if (clientPromise === pendingClient) {
        client = obs;
        clientPromise = null;
      }

      return obs;
    });
    clientPromise = pendingClient;
    return pendingClient;
  }

  function buildUrl() {
    return `ws://${config.value.host.trim()}:${config.value.port}`;
  }

  async function attemptConnection(epoch: number, reconnecting: boolean) {
    const obs = await ensureClient();
    if (!obs || epoch !== connectionEpoch) return false;

    try {
      const connectionInfo = await obs.connect(
        buildUrl(),
        config.value.password || undefined,
        { rpcVersion: 1 },
      );

      if (epoch !== connectionEpoch) {
        await obs.disconnect();
        return false;
      }

      error.value = null;
      reconnectAttempt.value = 0;
      status.value = "conectado";
      metadata.value = {
        obsWebSocketVersion: connectionInfo.obsWebSocketVersion,
        negotiatedRpcVersion: connectionInfo.negotiatedRpcVersion,
      };
      return true;
    } catch (caughtError) {
      if (epoch !== connectionEpoch) return false;

      const nextError = connectionError(caughtError);
      if (
        !reconnecting ||
        nextError.kind === "authentication" ||
        nextError.kind === "protocol" ||
        nextError.kind === "session-invalidated"
      ) {
        setError(nextError);
        return false;
      }

      scheduleReconnect(epoch);
      return false;
    }
  }

  function scheduleReconnect(epoch: number) {
    if (epoch !== connectionEpoch || manuallyDisconnected) return;

    if (reconnectAttempt.value >= RECONNECT_DELAYS.length) {
      setError({
        kind: "reconnect-exhausted",
        message: "Não foi possível reconectar ao OBS após 5 tentativas.",
      });
      return;
    }

    const delay = RECONNECT_DELAYS[reconnectAttempt.value];
    reconnectAttempt.value += 1;
    status.value = "reconectando";
    error.value = null;
    clearReconnectTimer();
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void attemptConnection(epoch, true);
    }, delay);
  }

  function handleUnexpectedClose(caughtError: unknown) {
    if (manuallyDisconnected) return;

    if (errorCode(caughtError) === 4011) {
      setError(connectionError(caughtError));
      return;
    }

    if (status.value !== "conectado") return;

    metadata.value = null;
    reconnectAttempt.value = 0;
    const epoch = ++connectionEpoch;
    scheduleReconnect(epoch);
  }

  async function connect() {
    if (!import.meta.client) return false;
    if (status.value === "conectando" || status.value === "reconectando") {
      return false;
    }

    const validationError = validateConfig(config.value);
    if (validationError) {
      setError(validationError);
      return false;
    }

    persistConfig(config.value);

    if (window.location.protocol === "https:") {
      setError({
        kind: "mixed-content",
        message:
          "Esta página usa HTTPS e o navegador pode bloquear a conexão local ws:// com o OBS.",
      });
      return false;
    }

    manuallyDisconnected = false;
    clearReconnectTimer();
    error.value = null;
    reconnectAttempt.value = 0;
    status.value = "conectando";
    const epoch = ++connectionEpoch;
    return attemptConnection(epoch, false);
  }

  async function disconnect() {
    manuallyDisconnected = true;
    const epoch = ++connectionEpoch;
    clearReconnectTimer();

    const obs = client;
    if (obs) {
      try {
        await obs.disconnect();
      } catch {
        // A interface deve terminar limpa mesmo se o socket já tiver fechado.
      }
    }

    if (epoch !== connectionEpoch) return;
    status.value = "desconectado";
    error.value = null;
    metadata.value = null;
    reconnectAttempt.value = 0;
  }

  async function dispose() {
    manuallyDisconnected = true;
    const epoch = ++connectionEpoch;
    clearReconnectTimer();

    const obs = client;
    const pendingClient = clientPromise;
    client = null;
    clientPromise = null;
    obs?.removeAllListeners();

    if (obs) {
      try {
        await obs.disconnect();
      } catch {
        // O socket pode já estar encerrado durante a desmontagem.
      }
    }

    if (pendingClient) {
      const pendingObs = await pendingClient;
      pendingObs.removeAllListeners();
      try {
        await pendingObs.disconnect();
      } catch {
        // O cliente ainda pode não ter aberto um socket.
      }
    }

    if (epoch !== connectionEpoch) return;
    if (!config.value.rememberPassword) config.value.password = "";
    status.value = "desconectado";
    error.value = null;
    metadata.value = null;
    reconnectAttempt.value = 0;
  }

  async function call<Type extends keyof OBSRequestTypes>(
    requestType: Type,
    requestData?: OBSRequestTypes[Type],
  ): Promise<OBSResponseTypes[Type]> {
    if (!client || status.value !== "conectado") {
      throw new Error("O OBS não está conectado.");
    }

    return client.call(requestType, requestData);
  }

  function updateRememberPassword(rememberPassword: boolean) {
    config.value.rememberPassword = rememberPassword;
    persistConfig(config.value);
  }

  watch(user, (nextUser, previousUser) => {
    if (previousUser && !nextUser) void dispose();
  });

  onScopeDispose(() => {
    void dispose();
  });

  return {
    status: readonly(status),
    error: readonly(error),
    config,
    metadata: readonly(metadata),
    reconnectAttempt: readonly(reconnectAttempt),
    connect,
    disconnect,
    call,
    updateRememberPassword,
  };
}
