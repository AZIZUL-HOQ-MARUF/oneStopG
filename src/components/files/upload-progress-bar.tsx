import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload } from "lucide-react";

interface UploadProgressBarProps {
  uploading: boolean;
  uploadProgress: number;
}

export function UploadProgressBar({
  uploading,
  uploadProgress,
}: UploadProgressBarProps) {
  if (!uploading) return null;

  return (
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
  );
}
