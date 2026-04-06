import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FolderInput, Trash2, X } from "lucide-react";

interface MultiSelectBarProps {
  count: number;
  onBulkMove: () => void;
  onBulkTrash: () => void;
  onDeselectAll: () => void;
}

export function MultiSelectBar({
  count,
  onBulkMove,
  onBulkTrash,
  onDeselectAll,
}: MultiSelectBarProps) {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <Card className="shadow-lg border-primary/30">
        <CardContent className="py-2 px-4 flex items-center gap-3">
          <span className="text-sm font-medium">{count} selected</span>
          <Button variant="outline" size="sm" onClick={onBulkMove}>
            <FolderInput className="mr-2 h-4 w-4" />
            Move to…
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onBulkTrash}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Trash
          </Button>
          <Button variant="ghost" size="sm" onClick={onDeselectAll}>
            <X className="mr-1 h-4 w-4" />
            Deselect
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
