export const STORAGE_BUCKET = "post-media";

type UploadType = "cover" | "media";

const LIMITS: Record<UploadType, { mime: string; maxMB: number }> = {
  cover: { mime: "image/*", maxMB: 10 },
  media: { mime: "audio/*,video/*", maxMB: 50 },
};

export function usePostMedia() {
  const supabase = useSupabaseClient();

  function generatePath(userId: string, file: File): string {
    const ext = file.name.split(".").pop();
    const uuid = crypto.randomUUID();
    return `${userId}/${uuid}.${ext}`;
  }

  function validateFile(file: File, type: UploadType): string | null {
    const limit = LIMITS[type];
    if (file.size > limit.maxMB * 1024 * 1024) {
      return `Arquivo muito grande. Máximo ${limit.maxMB}MB.`;
    }
    const [main] = limit.mime.split("/");
    const fileMain = file.type.split("/")[0];
    if (main !== "*" && main !== fileMain) {
      return "Tipo de arquivo inválido.";
    }
    return null;
  }

  async function uploadFile(file: File, userId: string): Promise<string> {
    const path = generatePath(userId, file);
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: false });
    if (error) throw error;
    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return publicUrl;
  }

  async function deleteFile(url: string): Promise<void> {
    const path = extractPathFromUrl(url);
    if (!path) return;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([path]);
    if (error) throw error;
  }

  function extractPathFromUrl(url: string): string | null {
    const regex = new RegExp(
      `/storage/v1/object/public/${STORAGE_BUCKET}/(.+)$`,
    );
    const match = url.match(regex);
    return match ? (match[1] ?? null) : null;
  }

  return {
    uploadFile,
    deleteFile,
    validateFile,
    generatePath,
    extractPathFromUrl,
    LIMITS,
  };
}
