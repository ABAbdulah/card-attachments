-- DropIndex
DROP INDEX "transactions_card_id_date_raw_description_amount_local_key";

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "occurrence" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "transactions_card_id_date_raw_description_amount_local_occu_key" ON "transactions"("card_id", "date", "raw_description", "amount_local", "occurrence");

