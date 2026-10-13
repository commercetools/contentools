/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the commercetools-labs contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

export type ProviderId = 'gcp' | 'aws' | 'cloudinary';

export interface PutInput {
  key: string;
  body: Buffer;
  contentType: string;
  title?: string;
  description?: string;
}

export interface StoredObject {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface ListInput {
  prefix: string;
  limit: number;
  cursor?: string;
}

export interface MediaFile {
  key: string;
  url: string;
  name: string;
  isImage: boolean;
  title?: string;
  description?: string;
  createdAt?: string;
  size?: number;
  contentType?: string;
}

/** `nextCursor` is the provider-native token; cursor.ts wraps it for clients. */
export interface ListPage {
  files: MediaFile[];
  nextCursor: string | null;
}

export interface StorageProvider {
  readonly id: ProviderId;
  put(input: PutInput): Promise<StoredObject>;
  /** One provider page. Never filters by extension. */
  list(input: ListInput): Promise<ListPage>;
  /** A missing key is success. */
  remove(key: string): Promise<void>;
  /** Throws StorageUnavailableError. */
  checkConnectivity(): Promise<void>;
}
