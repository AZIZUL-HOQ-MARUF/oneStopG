"use client";

import { useCallback } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import * as drive from "@/services/drive";
import type { FileMetadata, ConnectedAccount } from "@/types";

/** Module-level blob URL cache — survives re-renders and route changes */
const blobCache = new Map<string, string>();

export function useDrive() {
  const { accounts, getToken } = useAccounts();

  const renameFile = useCallback(
    async (file: FileMetadata, newName: string) => {
      const token = await getToken(file.accountEmail);
      await drive.renameFile(token, file.driveFileId, newName);
    },
    [getToken],
  );

  const moveFile = useCallback(
    async (
      file: FileMetadata,
      newParentId: string,
      oldParentId?: string,
    ) => {
      const token = await getToken(file.accountEmail);
      await drive.moveFile(token, file.driveFileId, newParentId, oldParentId);
    },
    [getToken],
  );

  const trashFile = useCallback(
    async (file: FileMetadata) => {
      const token = await getToken(file.accountEmail);
      await drive.trashFile(token, file.driveFileId);
    },
    [getToken],
  );

  const restoreFile = useCallback(
    async (file: FileMetadata) => {
      const token = await getToken(file.accountEmail);
      await drive.restoreFile(token, file.driveFileId);
    },
    [getToken],
  );

  const deleteFile = useCallback(
    async (file: FileMetadata) => {
      const token = await getToken(file.accountEmail);
      await drive.deleteFile(token, file.driveFileId);
    },
    [getToken],
  );

  const shareFile = useCallback(
    async (file: FileMetadata, email?: string): Promise<string> => {
      const token = await getToken(file.accountEmail);
      return drive.shareFile(token, file.driveFileId, email);
    },
    [getToken],
  );

  const unshareFile = useCallback(
    async (file: FileMetadata) => {
      const token = await getToken(file.accountEmail);
      await drive.unshareFile(token, file.driveFileId);
    },
    [getToken],
  );

  const getDownloadUrl = useCallback(
    async (file: FileMetadata): Promise<string> => {
      const token = await getToken(file.accountEmail);
      return drive.getDownloadUrl(token, file.driveFileId, file.mimeType);
    },
    [getToken],
  );

  const openFile = useCallback(
    async (file: FileMetadata): Promise<string> => {
      const token = await getToken(file.accountEmail);
      return drive.getWebViewLink(token, file.driveFileId);
    },
    [getToken],
  );

  const getPreviewBlobUrl = useCallback(
    async (file: FileMetadata): Promise<string> => {
      const cached = blobCache.get(file.driveFileId);
      if (cached) return cached;
      const token = await getToken(file.accountEmail);
      const url = await drive.fetchFileBlob(token, file.driveFileId);
      blobCache.set(file.driveFileId, url);
      return url;
    },
    [getToken],
  );

  const createFolder = useCallback(
    async (name: string, parentId?: string, accountEmail?: string) => {
      const email = accountEmail ?? accounts[0]?.email;
      if (!email) throw new Error("No account connected");
      const token = await getToken(email);
      return drive.createFolder(token, name, parentId);
    },
    [accounts, getToken],
  );

  const uploadFile = useCallback(
    async (
      file: File,
      parentId?: string,
      onProgress?: (percent: number) => void,
    ) => {
      // Build ConnectedAccount-like objects for pickBestAccount
      const connectedAccounts: ConnectedAccount[] = accounts.map((a) => ({
        email: a.email,
        accessToken: a.accessToken,
        refreshToken: a.refreshToken,
        tokenExpiry: a.expiresAt * 1000,
        storageQuota: a.storageQuota,
      }));

      const bestAccount = drive.pickBestAccount(connectedAccounts);
      if (!bestAccount) throw new Error("No accounts with available storage");

      const token = await getToken(bestAccount.email);
      return drive.uploadFile(token, file, parentId, onProgress);
    },
    [accounts, getToken],
  );

  return {
    renameFile,
    moveFile,
    trashFile,
    restoreFile,
    deleteFile,
    shareFile,
    unshareFile,
    getDownloadUrl,
    openFile,
    getPreviewBlobUrl,
    createFolder,
    uploadFile,
    getToken,
    accounts,
  };
}
