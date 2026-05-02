import { FolderOpen } from "lucide-react";
import { filesFromList } from "../../utils/fileUtils";
import type { SelectedFile } from "../../types";

export function FolderSelector({
  onFiles,
}: {
  onFiles: (files: SelectedFile[]) => void;
}) {
  return (
    <label className="secondary-button cursor-pointer">
      <FolderOpen size={16} />
      Folder
      <input
        type="file"
        multiple
        className="hidden"
        ref={(input) => {
          if (input) {
            input.webkitdirectory = true;
          }
        }}
        onChange={(event) =>
          event.target.files && onFiles(filesFromList(event.target.files))
        }
      />
    </label>
  );
}
