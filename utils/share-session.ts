export type SharePayload = {
  score: number;
  tierTitle: string;
  tierMessage: string;
};

let latestSharePayload: SharePayload | null = null;

export function setSharePayload(payload: SharePayload) {
  latestSharePayload = payload;
}

export function getSharePayload() {
  return latestSharePayload;
}
