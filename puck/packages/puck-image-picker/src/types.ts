export interface MediaFile {
  url: string;
  name: string;
  title?: string;
  description?: string;
  isImage: boolean;
  createdAt: Date | string;
  size?: number;
}

export interface MediaLibraryPagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface MediaLibraryResult {
  files: MediaFile[];
  pagination: MediaLibraryPagination;
}
