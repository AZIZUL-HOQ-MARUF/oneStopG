export interface ConnectedAccount {
  email: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  storageQuota: {
    used: number;
    limit: number;
    free: number;
  };
}

export interface FileMetadata {
  driveFileId: string;
  fileName: string;
  accountEmail: string;
  size: number;
  mimeType: string | null;
  hasThumbnail: boolean;
  thumbnailLink: string | null;
  parentDriveFileId: string | null;
  createdAt: string;
}

export interface UserProfile {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
}

export interface AccountQuota {
  email: string;
  used: number;
  limit: number;
  free: number;
  isConnected: boolean;
}

export interface ToastMessage {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

/** Shape of the connected accounts stored in the session JWT */
export interface SessionAccount {
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  storageQuota: {
    used: number;
    limit: number;
    free: number;
  };
}
