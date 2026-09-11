/** Locked GCP Secret Manager project (Tom/Matt 11 Sep 2026). Names only. */
export const GCP_VAULT_DEFAULTS = {
  projectId: "wombat-brokerage-services",
  projectNumber: "709295017178",
  location: "australia-southeast1",
  secrets: {
    nab: "wombat-nab-broker-portal",
    corelogic: "wombat-corelogic-property-hub",
  },
} as const;

export type GcpVaultSecretMap = {
  nab: string;
  corelogic: string;
};
