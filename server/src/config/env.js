const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z.coerce.number().int().min(1).max(65535).default(5000),

  CLIENT_URL: z.string().min(1).default("http://localhost:5173"),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) =>
        value.startsWith("postgresql://") ||
        value.startsWith("postgres://"),
      "DATABASE_URL must be a PostgreSQL connection URL"
    ),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must contain at least 32 characters"),

  JWT_EXPIRES_IN: z.string().default("1d"),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional()
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid server environment configuration:");

  for (const issue of result.error.issues) {
    console.error(`- ${issue.path.join(".")}: ${issue.message}`);
  }

  process.exit(1);
}

const env = result.data;

const cloudinaryValues = [
  env.CLOUDINARY_CLOUD_NAME,
  env.CLOUDINARY_API_KEY,
  env.CLOUDINARY_API_SECRET
];

const cloudinaryConfigured = cloudinaryValues.every(
  (value) => Boolean(value && value.trim())
);

const cloudinaryPartiallyConfigured = cloudinaryValues.some(
  (value) => Boolean(value && value.trim())
);

if (cloudinaryPartiallyConfigured && !cloudinaryConfigured) {
  console.error(
    "Cloudinary configuration is incomplete. Provide all three Cloudinary environment variables."
  );

  process.exit(1);
}

module.exports = {
  ...env,
  cloudinaryConfigured
};