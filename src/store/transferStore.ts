import { create } from "zustand";
import type { IncomingTransferRequest, OutgoingTransfer, ReceivingTransfer, SelectedFile, TransferProgress } from "../types";

interface TransferStore {
  files: SelectedFile[];
  progress: TransferProgress[];
  incoming?: IncomingTransferRequest;
  receiving?: ReceivingTransfer;
  outgoing?: OutgoingTransfer;
  transferComplete: boolean;
  error?: string;
  success?: string;
  addFiles: (files: SelectedFile[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  clearProgress: () => void;
  setProgress: (progress: TransferProgress) => void;
  setIncoming: (incoming?: IncomingTransferRequest) => void;
  setReceiving: (receiving?: ReceivingTransfer) => void;
  setOutgoing: (outgoing?: OutgoingTransfer) => void;
  setOutgoingSessionId: (sessionId: string) => void;
  setTransferComplete: (complete: boolean) => void;
  setError: (error?: string) => void;
  setSuccess: (success?: string) => void;
}

export const useTransferStore = create<TransferStore>((set) => ({
  files: [],
  progress: [],
  transferComplete: false,
  addFiles: (files) => set((state) => ({ files: [...state.files, ...files] })),
  removeFile: (id) => set((state) => ({ files: state.files.filter((item) => item.id !== id) })),
  clearFiles: () => set({ files: [] }),
  clearProgress: () => set({ progress: [] }),
  setProgress: (incoming) =>
    set((state) => ({
      progress: [
        ...state.progress.filter((item) => item.sessionId !== incoming.sessionId || item.fileId !== incoming.fileId),
        incoming
      ]
    })),
  setIncoming: (incoming) => set({ incoming }),
  setReceiving: (receiving) => set({ receiving }),
  setOutgoing: (outgoing) => set({ outgoing }),
  setOutgoingSessionId: (sessionId) =>
    set((state) =>
      state.outgoing ? { outgoing: { ...state.outgoing, sessionId } } : state
    ),
  setTransferComplete: (transferComplete) => set({ transferComplete }),
  setError: (error) => set({ error }),
  setSuccess: (success) => set({ success })
}));
