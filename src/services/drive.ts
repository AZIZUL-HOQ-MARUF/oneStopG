import type { ConnectedAccount, FileMetadata, AccountQuota } from "@/types";

const ONESTOPG_FOLDER = "_OneStopG_";

// ── Retry Logic ────────────────────────────────────────────
async function retryOnRateLimit<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  const delays = [1000, 2000, 4000];
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const status =
        err instanceof Error && "status" in err
          ? (err as { status: number }).status
          : undefined;
      if (status === 429 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delays[attempt] ?? 4000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

async function driveRequest(
  token: string,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const response = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = new Error(`Drive API ${response.status}: ${response.statusText}`);
    (error as unknown as { status: number }).status = response.status;
    throw error;
  }

  return response;
}

// ── File Operations ────────────────────────────────────────
export async function listFiles(
  token: string,
  query: string = "'me' in owners and trashed = false",
  pageSize: number = 1000,
): Promise<FileMetadata[]> {
  const items: FileMetadata[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: query,
      pageSize: String(pageSize),
      fields:
        "nextPageToken, files(id, name, size, mimeType, thumbnailLink, createdTime, parents)",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const response = await retryOnRateLimit(() =>
      driveRequest(
        token,
        `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      ),
    );

    const data = await response.json();

    for (const f of data.files ?? []) {
      items.push({
        driveFileId: f.id,
        fileName: f.name ?? "",
        accountEmail: "",
        size: parseInt(f.size ?? "0", 10),
        mimeType: f.mimeType ?? null,
        hasThumbnail: !!f.thumbnailLink,
        thumbnailLink: f.thumbnailLink ?? null,
        parentDriveFileId: f.parents?.[0] ?? null,
        createdAt: f.createdTime ?? "",
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
}

export async function getStorageQuota(
  token: string,
): Promise<{ used: number; limit: number; free: number }> {
  const response = await retryOnRateLimit(() =>
    driveRequest(
      token,
      "https://www.googleapis.com/drive/v3/about?fields=storageQuota",
    ),
  );

  const data = await response.json();
  const used = parseInt(data.storageQuota?.usage ?? "0", 10);
  const limit = parseInt(
    data.storageQuota?.limit ?? String(15 * 1024 ** 3),
    10,
  );

  return { used, limit, free: Math.max(0, limit - used) };
}

export async function renameFile(
  token: string,
  fileId: string,
  newName: string,
): Promise<void> {
  await retryOnRateLimit(() =>
    driveRequest(
      token,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name: newName }),
        headers: { "Content-Type": "application/json" },
      },
    ),
  );
}

export async function moveFile(
  token: string,
  fileId: string,
  newParentId: string,
  oldParentId?: string,
): Promise<void> {
  const params = new URLSearchParams({ addParents: newParentId });
  if (oldParentId) {
    params.set("removeParents", oldParentId);
  }

  await retryOnRateLimit(() =>
    driveRequest(
      token,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params.toString()}`,
      { method: "PATCH" },
    ),
  );
}

export async function trashFile(
  token: string,
  fileId: string,
): Promise<void> {
  await retryOnRateLimit(() =>
    driveRequest(
      token,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ trashed: true }),
        headers: { "Content-Type": "application/json" },
      },
    ),
  );
}

export async function restoreFile(
  token: string,
  fileId: string,
): Promise<void> {
  await retryOnRateLimit(() =>
    driveRequest(
      token,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ trashed: false }),
        headers: { "Content-Type": "application/json" },
      },
    ),
  );
}

export async function deleteFile(
  token: string,
  fileId: string,
): Promise<void> {
  await retryOnRateLimit(() =>
    driveRequest(
      token,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
      { method: "DELETE" },
    ),
  );
}

export async function shareFile(
  token: string,
  fileId: string,
  email?: string,
): Promise<string> {
  const permission: Record<string, string> = email
    ? { type: "user", role: "reader", emailAddress: email }
    : { type: "anyone", role: "reader" };

  await retryOnRateLimit(() =>
    driveRequest(
      token,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions`,
      {
        method: "POST",
        body: JSON.stringify(permission),
        headers: { "Content-Type": "application/json" },
      },
    ),
  );

  const meta = await retryOnRateLimit(() =>
    driveRequest(
      token,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=webViewLink`,
    ),
  );

  const result = await meta.json();
  return (
    result.webViewLink ??
    `https://drive.google.com/file/d/${fileId}/view?usp=sharing`
  );
}

export async function unshareFile(
  token: string,
  fileId: string,
): Promise<void> {
  const perms = await retryOnRateLimit(() =>
    driveRequest(
      token,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?fields=permissions(id,type)`,
    ),
  );

  const result = await perms.json();
  const anyoneId = result.permissions?.find(
    (p: { id: string; type: string }) => p.type === "anyone",
  )?.id;

  if (anyoneId) {
    await retryOnRateLimit(() =>
      driveRequest(
        token,
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions/${anyoneId}`,
        { method: "DELETE" },
      ),
    );
  }
}

export async function listTrash(
  token: string,
  accountEmail: string,
): Promise<FileMetadata[]> {
  return listFiles(token, "'me' in owners and trashed = true").then(
    (files) => files.map((f) => ({ ...f, accountEmail })),
  );
}

export async function listSharedFiles(
  token: string,
  accountEmail: string,
): Promise<(FileMetadata & { sharedBy: string | null })[]> {
  const items: (FileMetadata & { sharedBy: string | null })[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: "not 'me' in owners and trashed = false",
      pageSize: "1000",
      fields:
        "nextPageToken, files(id, name, size, mimeType, createdTime, owners)",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const response = await retryOnRateLimit(() =>
      driveRequest(
        token,
        `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      ),
    );

    const data = await response.json();

    for (const f of data.files ?? []) {
      items.push({
        driveFileId: f.id,
        fileName: f.name ?? "",
        accountEmail,
        size: parseInt(f.size ?? "0", 10),
        mimeType: f.mimeType ?? null,
        hasThumbnail: false,
        thumbnailLink: null,
        parentDriveFileId: null,
        createdAt: f.createdTime ?? "",
        sharedBy: f.owners?.[0]?.emailAddress ?? null,
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
}

// ── Upload (REST API, XHR for progress) ────────────────────
export function uploadFile(
  token: string,
  file: File,
  parentId?: string,
  onProgress?: (percent: number) => void,
): Promise<{ driveFileId: string; size: number; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const metadata: Record<string, unknown> = { name: file.name };
    if (parentId) metadata.parents = [parentId];

    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    );
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,size,mimeType",
    );
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const result = JSON.parse(xhr.responseText) as {
          id: string;
          size?: string;
          mimeType?: string;
        };
        resolve({
          driveFileId: result.id,
          size: parseInt(result.size ?? "0", 10),
          mimeType: result.mimeType ?? file.type,
        });
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Upload network error"));
    xhr.send(form);
  });
}

// ── Download / Preview ─────────────────────────────────────

const EXPORT_MAP: Record<string, { mime: string; ext: string }> = {
  "application/vnd.google-apps.document": { mime: "application/pdf", ext: "pdf" },
  "application/vnd.google-apps.spreadsheet": {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: "xlsx",
  },
  "application/vnd.google-apps.presentation": {
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ext: "pptx",
  },
  "application/vnd.google-apps.drawing": { mime: "application/pdf", ext: "pdf" },
};

/** Google Workspace types that can be exported as PDF for inline preview */
export const PREVIEWABLE_WORKSPACE_TYPES = new Set([
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.presentation",
  "application/vnd.google-apps.drawing",
]);

export function isGoogleWorkspaceFile(mimeType: string | null): boolean {
  return !!mimeType && mimeType.startsWith("application/vnd.google-apps.");
}

export function getDownloadUrl(
  token: string,
  fileId: string,
  mimeType?: string | null,
): string {
  const id = encodeURIComponent(fileId);
  const t = encodeURIComponent(token);
  if (mimeType && EXPORT_MAP[mimeType]) {
    const exp = EXPORT_MAP[mimeType];
    return `https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=${encodeURIComponent(exp.mime)}&access_token=${t}`;
  }
  return `https://www.googleapis.com/drive/v3/files/${id}?alt=media&access_token=${t}`;
}

export async function getWebViewLink(
  token: string,
  fileId: string,
): Promise<string> {
  const response = await retryOnRateLimit(() =>
    driveRequest(
      token,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=webViewLink,webContentLink`,
    ),
  );
  const data = await response.json();
  return (
    data.webViewLink ??
    data.webContentLink ??
    `https://drive.google.com/file/d/${fileId}/view`
  );
}

// ── Fetch File Blob (authenticated, for inline preview) ────
export async function fetchFileBlob(
  token: string,
  fileId: string,
): Promise<string> {
  const response = await retryOnRateLimit(() =>
    driveRequest(
      token,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    ),
  );
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

/** Export a Google Workspace file (Docs, Slides, Drawings) as PDF blob for inline preview */
export async function fetchExportBlob(
  token: string,
  fileId: string,
  exportMimeType: string = "application/pdf",
): Promise<string> {
  const response = await retryOnRateLimit(() =>
    driveRequest(
      token,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportMimeType)}`,
    ),
  );
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

// ── Sync All Files ─────────────────────────────────────────
export async function syncAllFiles(
  token: string,
  accountEmail: string,
): Promise<FileMetadata[]> {
  const files = await listFiles(token);
  return files.map((f) => ({ ...f, accountEmail }));
}

// ── Smart Account Routing ──────────────────────────────────
export function pickBestAccount(
  accounts: ConnectedAccount[],
): ConnectedAccount | null {
  const connected = accounts.filter(
    (a) => a.storageQuota.free > 0 && a.accessToken,
  );
  if (connected.length === 0) return null;
  return connected.reduce((best, current) =>
    current.storageQuota.free > best.storageQuota.free ? current : best,
  );
}

// ── Get All Quotas (parallel, bypass shared state) ─────────
export async function getAllQuotas(
  accounts: { email: string; accessToken: string; storageQuota: { used: number; limit: number; free: number } }[],
): Promise<AccountQuota[]> {
  const results = await Promise.allSettled(
    accounts.map(async (account) => {
      try {
        const quota = await getStorageQuota(account.accessToken);
        return {
          email: account.email,
          used: quota.used,
          limit: quota.limit,
          free: quota.free,
          isConnected: true,
        };
      } catch {
        return {
          email: account.email,
          used: account.storageQuota.used,
          limit: account.storageQuota.limit,
          free: account.storageQuota.free,
          isConnected: true,
        };
      }
    }),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<AccountQuota> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value);
}

// ── Get or Create OneStopG Folder ──────────────────────────
export async function getOrCreateFolder(
  token: string,
  folderName: string = ONESTOPG_FOLDER,
): Promise<string> {
  const searchParams = new URLSearchParams({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
  });

  const search = await retryOnRateLimit(() =>
    driveRequest(
      token,
      `https://www.googleapis.com/drive/v3/files?${searchParams.toString()}`,
    ),
  );

  const searchResult = await search.json();
  const existingId = searchResult.files?.[0]?.id;
  if (existingId) return existingId;

  const create = await retryOnRateLimit(() =>
    driveRequest(
      token,
      "https://www.googleapis.com/drive/v3/files",
      {
        method: "POST",
        body: JSON.stringify({
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
        }),
        headers: { "Content-Type": "application/json" },
      },
    ),
  );

  const createResult = await create.json();
  return createResult.id;
}

// ── Create Folder ──────────────────────────────────────────
export async function createFolder(
  token: string,
  name: string,
  parentId?: string,
): Promise<string> {
  const metadata: Record<string, unknown> = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) metadata.parents = [parentId];

  const response = await retryOnRateLimit(() =>
    driveRequest(
      token,
      "https://www.googleapis.com/drive/v3/files?fields=id",
      {
        method: "POST",
        body: JSON.stringify(metadata),
        headers: { "Content-Type": "application/json" },
      },
    ),
  );

  const result = await response.json();
  return result.id;
}
