export type PortalConnectorFile = {
  users: Array<{
    username: string;
    password: string;
    label?: string;
  }>;
};

export const PORTAL_JWT_TYP = 'portal_connector' as const;
