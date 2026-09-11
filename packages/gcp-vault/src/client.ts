import { defaultFixtureSecretJson } from "./fixtures.js";

export type SecretAccessClient = {
  accessSecretJson(secretId: string): Promise<string>;
};

/** Global Secret Manager name. User-managed replication is australia-southeast1 (not Automatic). */
export function secretVersionName(projectId: string, secretId: string, location?: string): string {
  if (location) {
    return `projects/${projectId}/locations/${location}/secrets/${secretId}/versions/latest`;
  }
  return `projects/${projectId}/secrets/${secretId}/versions/latest`;
}

export function createFixtureSecretAccessClient(
  secrets: Record<string, string> = defaultFixtureSecretJson(),
): SecretAccessClient {
  const store = { ...secrets };
  return {
    async accessSecretJson(secretId: string) {
      const payload = store[secretId];
      if (payload === undefined) {
        throw new Error(`Fixture vault has no secret ${secretId}`);
      }
      return payload;
    },
  };
}

export function createLiveSecretAccessClient(args: {
  projectId: string;
  location?: string;
}): SecretAccessClient {
  const { projectId, location } = args;
  return {
    async accessSecretJson(secretId: string) {
      const { SecretManagerServiceClient } = await import("@google-cloud/secret-manager");
      const client = new SecretManagerServiceClient();
      const name = secretVersionName(projectId, secretId, location);
      const [version] = await client.accessSecretVersion({ name });
      const data = version.payload?.data;
      if (data == null) {
        throw new Error(`Secret Manager payload empty for ${secretId}`);
      }
      if (typeof data === "string") {
        return data;
      }
      return Buffer.from(data).toString("utf8");
    },
  };
}
