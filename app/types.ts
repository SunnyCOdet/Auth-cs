export type User = {
  id: number;
  email: string;
  username: string;
  passwordHash?: string; // Optional as we don't always fetch/send it
  createdAt?: string;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
};

export type LicenseKey = {
  id: number;
  userId: number;
  licenseKey: string;
  isActive: boolean;
  createdAt: string;
};

export type ApiKey = {
    id: number;
    apiKey: string;
    description: string | null;
    isActive: boolean;
    createdAt: string;
};
