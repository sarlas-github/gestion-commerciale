-- Migration: Final Complete ON DELETE CASCADE
-- This includes the missing links between items and products that were blocking deletion.

BEGIN;

-- 1. AUTH USERS LINKS (Direct)
ALTER TABLE "public"."companies" DROP CONSTRAINT IF EXISTS "companies_user_id_fkey";
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."products" DROP CONSTRAINT IF EXISTS "products_user_id_fkey";
ALTER TABLE "public"."products" ADD CONSTRAINT "products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."clients" DROP CONSTRAINT IF EXISTS "clients_user_id_fkey";
ALTER TABLE "public"."clients" ADD CONSTRAINT "clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."suppliers" DROP CONSTRAINT IF EXISTS "suppliers_user_id_fkey";
ALTER TABLE "public"."suppliers" ADD CONSTRAINT "suppliers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."sales" DROP CONSTRAINT IF EXISTS "sales_user_id_fkey";
ALTER TABLE "public"."sales" ADD CONSTRAINT "sales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."purchases" DROP CONSTRAINT IF EXISTS "purchases_user_id_fkey";
ALTER TABLE "public"."purchases" ADD CONSTRAINT "purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."stock" DROP CONSTRAINT IF EXISTS "stock_user_id_fkey";
ALTER TABLE "public"."stock" ADD CONSTRAINT "stock_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."documents" DROP CONSTRAINT IF EXISTS "documents_user_id_fkey";
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."client_payments" DROP CONSTRAINT IF EXISTS "client_payments_user_id_fkey";
ALTER TABLE "public"."client_payments" ADD CONSTRAINT "client_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."supplier_payments" DROP CONSTRAINT IF EXISTS "supplier_payments_user_id_fkey";
ALTER TABLE "public"."supplier_payments" ADD CONSTRAINT "supplier_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_user_id_fkey";
ALTER TABLE "public"."stock_movements" ADD CONSTRAINT "stock_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE "public"."document_sequences" DROP CONSTRAINT IF EXISTS "document_sequences_user_id_fkey";
ALTER TABLE "public"."document_sequences" ADD CONSTRAINT "document_sequences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- 2. INTERNAL LINKS (Parent-Child)
ALTER TABLE "public"."sale_items" DROP CONSTRAINT IF EXISTS "sale_items_sale_id_fkey";
ALTER TABLE "public"."sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;

ALTER TABLE "public"."purchase_items" DROP CONSTRAINT IF EXISTS "purchase_items_purchase_id_fkey";
ALTER TABLE "public"."purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE CASCADE;

ALTER TABLE "public"."document_items" DROP CONSTRAINT IF EXISTS "document_items_document_id_fkey";
ALTER TABLE "public"."document_items" ADD CONSTRAINT "document_items_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;

-- 3. PRODUCT LINKS (Missing from last time)
-- This was the error: Products were blocked by items
ALTER TABLE "public"."sale_items" DROP CONSTRAINT IF EXISTS "sale_items_product_id_fkey";
ALTER TABLE "public"."sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;

ALTER TABLE "public"."purchase_items" DROP CONSTRAINT IF EXISTS "purchase_items_product_id_fkey";
ALTER TABLE "public"."purchase_items" ADD CONSTRAINT "purchase_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;

ALTER TABLE "public"."document_items" DROP CONSTRAINT IF EXISTS "document_items_product_id_fkey";
ALTER TABLE "public"."document_items" ADD CONSTRAINT "document_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;

COMMIT;
