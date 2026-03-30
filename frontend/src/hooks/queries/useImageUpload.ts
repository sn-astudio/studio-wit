import { useMutation } from "@tanstack/react-query";
import { imageApi } from "@/services/api";

export function useUploadImage() {
  return useMutation({
    mutationFn: (file: File) => imageApi.upload(file),
  });
}
