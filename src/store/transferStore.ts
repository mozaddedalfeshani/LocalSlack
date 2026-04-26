import { create } from "zustand";
import type { SelectedFile, TransferProgress } from "../types";

interface TransferStore {
  files: SelectedFile[];
  progress: TransferProgress[];
  error?: string;
  success?: string;
  addFiles: (files: SelectedFile[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  setProgress: (progress: TransferProgress) => void;
  setError: (error?: string) => void;
  setSuccess: (success?: string) => void;
}

export const useTransferStore = create<TransferStore>((set) => ({
  files: [],
  progress: [],
  addFiles: (files) => set((state) => ({ files: [...state.files, ...files] })),
  removeFile: (id) => set((state) => ({ files: state.files.filter((item) => item.id !== id) })),
  clearFiles: () => set({ files: [] }),
  setProgress: (incoming) =>
    set((state) => ({
      progress: [...state.progress.filter((item) => item.fileId !== incoming.fileId), incoming]
    })),
  setError: (error) => set({ error }),
  setSuccess: (success) => set({ success })
}));
