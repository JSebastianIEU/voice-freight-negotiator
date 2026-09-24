/** What POST /api/token returns. Shared by the route handler and the client. */
export type ConnectionDetails = {
  serverUrl: string;
  participantToken: string;
  roomName: string;
  participantIdentity: string;
};
