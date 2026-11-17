-- CreateEnum
CREATE TYPE "Billing" AS ENUM ('FIXED', 'USAGE', 'PURCHASE');

-- CreateEnum
CREATE TYPE "CandidateDecision" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('STILL_CHARGING', 'PRICE_INCREASE', 'VERIFIED_CANCEL');

-- DropIndex
DROP INDEX "merchants_name_key";

-- DropIndex
DROP INDEX "subscriptions_next_renewal_idx";

-- DropIndex
DROP INDEX "transactions_merchant_id_date_idx";

-- DropIndex
DROP INDEX "transactions_statement_id_idx";

-- AlterTable
ALTER TABLE "merchants" DROP COLUMN "cancel_url",
DROP COLUMN "logo_url",
ADD COLUMN     "billing" "Billing" NOT NULL,
ADD COLUMN     "brand_color" TEXT,
ADD COLUMN     "manage_url" TEXT,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "typical_cadence" "Cadence",
ADD COLUMN     "typical_currency" CHAR(3),
ADD COLUMN     "typical_price" DECIMAL(14,2),
ALTER COLUMN "category" SET NOT NULL,
ALTER COLUMN "is_subscription_service" DROP DEFAULT;

-- AlterTable
ALTER TABLE "statements" ADD COLUMN     "bank" TEXT NOT NULL,
ADD COLUMN     "charge_count" INTEGER NOT NULL,
ADD COLUMN     "duplicate_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "custom_name",
ADD COLUMN     "category" TEXT,
ADD COLUMN     "last_charged_at" DATE,
ADD COLUMN     "merchant_key" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "verified_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "card_id" UUID NOT NULL,
ADD COLUMN     "merchant_key" TEXT NOT NULL,
ADD COLUMN     "merchant_name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "display_name" TEXT,
ADD COLUMN     "onboarded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "savings_goal_monthly" DECIMAL(14,2);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "statement_id" UUID NOT NULL,
    "merchant_id" UUID,
    "merchant_key" TEXT NOT NULL,
    "merchant_name" TEXT NOT NULL,
    "confidence" "Confidence" NOT NULL,
    "reason" TEXT NOT NULL,
    "cadence" "Cadence",
    "charge_count" INTEGER NOT NULL,
    "first_charge" DATE NOT NULL,
    "last_charge" DATE NOT NULL,
    "last_amount_local" DECIMAL(14,2) NOT NULL,
    "price_original" DECIMAL(14,2),
    "original_currency" CHAR(3),
    "decision" "CandidateDecision" NOT NULL DEFAULT 'PENDING',
    "subscription_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "xp" INTEGER NOT NULL,
    "ref_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "user_id" UUID NOT NULL,
    "badge_id" TEXT NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("user_id","badge_id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subscription_id" UUID,
    "type" "AlertType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fx_rates" (
    "currency" CHAR(3) NOT NULL,
    "per_usd" DECIMAL(18,6) NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fx_rates_pkey" PRIMARY KEY ("currency")
);

-- CreateIndex
CREATE INDEX "otp_codes_email_created_at_idx" ON "otp_codes"("email", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "candidates_user_id_decision_idx" ON "candidates"("user_id", "decision");

-- CreateIndex
CREATE INDEX "xp_events_user_id_created_at_idx" ON "xp_events"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "xp_events_user_id_type_ref_id_key" ON "xp_events"("user_id", "type", "ref_id");

-- CreateIndex
CREATE INDEX "alerts_user_id_read_at_idx" ON "alerts"("user_id", "read_at");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_slug_key" ON "merchants"("slug");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_merchant_key_idx" ON "subscriptions"("user_id", "merchant_key");

-- CreateIndex
CREATE INDEX "transactions_card_id_merchant_key_date_idx" ON "transactions"("card_id", "merchant_key", "date");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_card_id_date_raw_description_amount_local_key" ON "transactions"("card_id", "date", "raw_description", "amount_local");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

