"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import NextImage from "next/image";
import { useFiles } from "@/hooks/useFiles";
import { useDrive } from "@/hooks/useDrive";
import { formatBytes, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Download,
  Share2,
  FolderOpen,
  FolderPlus,
  File,
  Image,
  Video,
  Music,
  FileText,
  Table,
  Archive,
  Grid,
  List,
  RefreshCw,
  ChevronRight,
  Eye,
  ExternalLink,
  X,
  Loader2,
} from "lucide-react";
import * as driveService from "@/services/drive";
import type { FileMetadata } from "@/types";

function FileIcon({ mimeType }: { mimeType: string | null }) {
  const t = mimeType ?? "";
  if (t === "application/vnd.google-apps.folder")
    return <FolderOpen className="h-5 w-5 text-blue-400" />;
  if (t.startsWith("image/"))
    // eslint-disable-next-line jsx-a11y/alt-text -- lucide-react icon, not <img>
    return <Image className="h-5 w-5 text-green-400" />;
  if (t.startsWith("video/"))
    return <Video className="h-5 w-5 text-purple-400" />;
  if (t.startsWith("audio/"))
    return <Music className="h-5 w-5 text-pink-400" />;
  if (t.includes("pdf") || t.includes("document") || t.startsWith("text/"))
    return <FileText className="h-5 w-5 text-orange-400" />;
  if (t.includes("spreadsheet") || t.includes("sheet"))
    return <Table className="h-5 w-5 text-emerald-400" />;
  if (t.includes("zip") || t.includes("compressed"))
    return <Archive className="h-5 w-5 text-yellow-400" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

function canPreviewInline(mimeType: string | null): boolean {
  const t = mimeType ?? "";
  return t.startsWith("image/") || t === "application/pdf";
}

export default function FilesPage() {
  const params = useParams<{ folderId?: string[] }>();
  const router = useRouter();

  // The current folder ID comes from the URL
  const currentFolder = params.folderId?.[0] ?? null;

  const { files, isLoading, refreshFiles } = useFiles();
  const {
    renameFile,
    trashFile,
    shareFile,
    getDownloadUrl,
    openFile,
    getPreviewBlobUrl,
    createFolder,
    uploadFile,
  } = useDrive();

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [accountFilter, setAccountFilter] = useState<string | "all">("all");
  const [renameDialog, setRenameDialog] = useState<FileMetadata | null>(null);
  const [newName, setNewName] = useState("");
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build breadcrumbs by walking the parent chain
  const breadcrumbs = useMemo(() => {
    const crumbs: { id: string | null; name: string }[] = [
      { id: null, name: "My Drive" },
    ];
    if (!currentFolder) return crumbs;

    // Walk up the parent chain
    const visited = new Set<string>();
    let fId: string | null = currentFolder;
    const chain: { id: string; name: string }[] = [];
    while (fId) {
      if (visited.has(fId)) break;
      visited.add(fId);
      const folder = files.find((f) => f.driveFileId === fId);
      if (!folder) break;
      chain.unshift({ id: folder.driveFileId, name: folder.fileName });
      fId = folder.parentDriveFileId;
    }
    return [...crumbs, ...chain];
  }, [currentFolder, files]);

  // Unique account emails
  const accountEmails = useMemo(
    () => [...new Set(files.map((f) => f.accountEmail))],
    [files],
  );

  // Filter files by account, current folder, and search
  const filteredFiles = files.filter((f) => {
    if (accountFilter !== "all" && f.accountEmail !== accountFilter)
      return false;

    const inFolder =
      currentFolder === null
        ? f.parentDriveFileId === null ||
          !files.some((p) => p.driveFileId === f.parentDriveFileId)
        : f.parentDriveFileId === currentFolder;

    const matchesSearch =
      !search || f.fileName.toLowerCase().includes(search.toLowerCase());

    return inFolder && matchesSearch;
  });

  // Sort: folders first, then by name
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    const aIsFolder = a.mimeType === "application/vnd.google-apps.folder";
    const bIsFolder = b.mimeType === "application/vnd.google-apps.folder";
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    return a.fileName.localeCompare(b.fileName);
  });

  const navigateToFolder = (file: FileMetadata) => {
    router.push(`/dashboard/files/${file.driveFileId}`);
  };

  const navigateToBreadcrumb = (index: number) => {
    const crumb = breadcrumbs[index];
    if (crumb.id === null) {
      router.push("/dashboard/files");
    } else {
      router.push(`/dashboard/files/${crumb.id}`);
    }
  };

  // Cleanup blob URL when preview closes
  useEffect(() => {
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    };
  }, [previewBlobUrl]);

  const closePreview = useCallback(() => {
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    setPreviewFile(null);
    setPreviewBlobUrl(null);
    setPreviewLoading(false);
    setPreviewError(null);
  }, [previewBlobUrl]);

  // Open a file based on its type
  const handleOpenFile = async (file: FileMetadata) => {
    if (file.mimeType === "application/vnd.google-apps.folder") {
      navigateToFolder(file);
      return;
    }
    // Google Workspace files -> open in Google Docs/Sheets/Slides
    if (driveService.isGoogleWorkspaceFile(file.mimeType)) {
      try {
        const url = await openFile(file);
        window.open(url, "_blank", "noopener");
      } catch (err) {
        toast.error("Failed to open file", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
      return;
    }
    // Images and PDFs -> inline preview via blob
    if (canPreviewInline(file.mimeType)) {
      setPreviewFile(file);
      setPreviewBlobUrl(null);
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const blobUrl = await getPreviewBlobUrl(file);
        setPreviewBlobUrl(blobUrl);
      } catch (err) {
        setPreviewError(
          err instanceof Error ? err.message : "Failed to load preview",
        );
      } finally {
        setPreviewLoading(false);
      }
      return;
    }
    // Everything else -> download
    handleDownload(file);
  };

  const handleRename = async () => {
    if (!renameDialog || !newName.trim()) return;
    try {
      await renameFile(renameDialog, newName.trim());
      toast.success("File renamed");
      setRenameDialog(null);
      refreshFiles();
    } catch (err) {
      toast.error("Failed to rename file", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    try {
      const email = accountFilter !== "all" ? accountFilter : undefined;
      await createFolder(folderName.trim(), currentFolder ?? undefined, email);
      toast.success("Folder created");
      setNewFolderDialog(false);
      setFolderName("");
      refreshFiles();
    } catch (err) {
      toast.error("Failed to create folder", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleTrash = async (file: FileMetadata) => {
    try {
      await trashFile(file);
      toast.success("Moved to trash");
      refreshFiles();
    } catch (err) {
      toast.error("Failed to trash file", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleShare = async (file: FileMetadata) => {
    try {
      const url = await shareFile(file);
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied to clipboard");
    } catch (err) {
      toast.error("Failed to share file", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleDownload = async (file: FileMetadata) => {
    try {
      const url = await getDownloadUrl(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.fileName;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      toast.error("Failed to download", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleUpload = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      setUploading(true);
      setUploadProgress(0);

      try {
        for (let i = 0; i < fileList.length; i++) {
          await uploadFile(
            fileList[i],
            currentFolder ?? undefined,
            (pct) => setUploadProgress(pct),
          );
        }
        toast.success(
          `Uploaded ${fileList.length} file${fileList.length > 1 ? "s" : ""} to current folder`,
        );
        refreshFiles();
      } catch (err) {
        toast.error("Upload failed", {
          description: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [currentFolder, uploadFile, refreshFiles],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleUpload(e.dataTransfer.files);
    },
    [handleUpload],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Files</h1>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1 flex-wrap">
            {breadcrumbs.map((crumb, i) => (
              <div key={crumb.id ?? "root"} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
                <button
                  onClick={() => navigateToBreadcrumb(i)}
                  className={`hover:text-foreground transition-colors ${
                    i === breadcrumbs.length - 1
                      ? "text-foreground font-medium"
                      : ""
                  }`}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setViewMode(viewMode === "list" ? "grid" : "list")
            }
          >
            {viewMode === "list" ? (
              <Grid className="h-4 w-4" />
            ) : (
              <List className="h-4 w-4" />
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={refreshFiles}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setFolderName("");
              setNewFolderDialog(true);
            }}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </Button>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Account filter tabs */}
      {accountEmails.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={accountFilter === "all" ? "default" : "outline"}
            onClick={() => setAccountFilter("all")}
          >
            All Accounts
          </Badge>
          {accountEmails.map((email) => (
            <Badge
              key={email}
              variant={accountFilter === email ? "default" : "outline"}
              onClick={() => setAccountFilter(email)}
            >
              {email}
            </Badge>
          ))}
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <Upload className="h-4 w-4 animate-bounce text-primary" />
              <Progress value={uploadProgress} className="flex-1 h-2" />
              <span className="text-sm text-muted-foreground">
                {uploadProgress}%
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drop zone + file list */}
      <Card
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="min-h-100"
      >
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mb-4" />
              <p className="text-lg">
                {search
                  ? "No files match your search"
                  : "This folder is empty"}
              </p>
              <p className="text-sm mt-1">
                Drag & drop files here or click Upload
              </p>
            </div>
          ) : viewMode === "list" ? (
            <div className="divide-y divide-border">
              {sortedFiles.map((file) => (
                <div
                  key={file.driveFileId}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors group cursor-pointer"
                  onClick={() => handleOpenFile(file)}
                >
                  <FileIcon mimeType={file.mimeType} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {file.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {file.accountEmail}
                    </p>
                  </div>
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    {formatBytes(file.size)}
                  </span>
                  <span className="hidden text-xs text-muted-foreground md:block">
                    {formatDate(file.createdAt)}
                  </span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          />
                        }
                      >
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {file.mimeType !==
                          "application/vnd.google-apps.folder" && (
                          <DropdownMenuItem
                            onClick={() => handleOpenFile(file)}
                          >
                            {canPreviewInline(file.mimeType) ? (
                              <>
                                <Eye className="mr-2 h-4 w-4" />
                                Preview
                              </>
                            ) : driveService.isGoogleWorkspaceFile(
                                file.mimeType,
                              ) ? (
                              <>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open in Google
                              </>
                            ) : (
                              <>
                                <Eye className="mr-2 h-4 w-4" />
                                Open
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => {
                            setNewName(file.fileName);
                            setRenameDialog(file);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        {file.mimeType !==
                          "application/vnd.google-apps.folder" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleDownload(file)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleShare(file)}
                            >
                              <Share2 className="mr-2 h-4 w-4" />
                              Share
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleTrash(file)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Trash
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {sortedFiles.map((file) => (
                <div
                  key={file.driveFileId}
                  className="group flex flex-col items-center rounded-lg border border-border p-4 hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => handleOpenFile(file)}
                >
                  {file.thumbnailLink &&
                  file.mimeType?.startsWith("image/") ? (
                    <NextImage
                      src={file.thumbnailLink}
                      alt={file.fileName}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded object-cover"
                      unoptimized
                    />
                  ) : (
                    <FileIcon mimeType={file.mimeType} />
                  )}
                  <p className="mt-2 text-xs font-medium text-center truncate w-full">
                    {file.fileName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatBytes(file.size)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rename Dialog */}
      <Dialog
        open={!!renameDialog}
        onOpenChange={(open) => !open && setRenameDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog
        open={newFolderDialog}
        onOpenChange={(open) => !open && setNewFolderDialog(false)}
      >
        <DialogContent>
          <DialogHeader className="pb-2">
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            autoFocus
          />
          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              onClick={() => setNewFolderDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog — large, with loader */}
      <Dialog
        open={!!previewFile}
        onOpenChange={(open) => {
          if (!open) closePreview();
        }}
      >
        <DialogContent className="max-w-[90vw]! w-full max-h-[92vh] h-[92vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-2 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="truncate pr-8 text-lg">
                {previewFile?.fileName}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center bg-muted/30 relative">
            {/* Loading spinner */}
            {previewLoading && (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium">Loading preview…</p>
              </div>
            )}

            {/* Error state */}
            {previewError && !previewLoading && (
              <div className="flex flex-col items-center gap-3 text-muted-foreground px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <X className="h-7 w-7 text-destructive" />
                </div>
                <p className="text-sm font-medium">Could not load preview</p>
                <p className="text-xs max-w-md">{previewError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    if (previewFile) handleOpenFile(previewFile);
                  }}
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Image preview */}
            {!previewLoading &&
              !previewError &&
              previewBlobUrl &&
              previewFile?.mimeType?.startsWith("image/") && (
                <NextImage
                  src={previewBlobUrl}
                  alt={previewFile.fileName}
                  width={1200}
                  height={800}
                  className="max-w-full max-h-[80vh] w-auto h-auto object-contain p-4"
                  unoptimized
                />
              )}

            {/* PDF preview */}
            {!previewLoading &&
              !previewError &&
              previewBlobUrl &&
              previewFile?.mimeType === "application/pdf" && (
                <iframe
                  src={previewBlobUrl}
                  className="w-full h-full border-0"
                  title={previewFile.fileName}
                />
              )}
          </div>

          <DialogFooter className="px-6 py-2 border-t gap-2">
            {/* <Button
              variant="outline"
              onClick={() => {
                if (previewFile) handleDownload(previewFile);
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" onClick={closePreview}>
              <X className="mr-2 h-4 w-4" />
              Close
            </Button> */}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
