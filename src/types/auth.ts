/** Claims carried by every MNL access token. */
export interface AuthTokenPayload {
  sub: string;
  email: string;
}
