export type AdminCredentials = {
  username: string;
  password: string;
};

// Reads the admin username and password from environment defaults.
export function getAdminCredentials(): AdminCredentials {
  return {
    username: process.env.PLAYWRIGHT_ADMIN_USERNAME ?? 'admin',
    password: process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? 'admin',
  };
}
