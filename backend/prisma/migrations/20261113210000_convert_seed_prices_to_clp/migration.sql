-- Convierte únicamente los precios iniciales históricos expresados como euros
-- a sus valores en pesos chilenos. Los precios personalizados no se modifican.
UPDATE "services" SET "price" = 15000
WHERE "id" = 'svc-corte' AND "price" = 15;

UPDATE "services" SET "price" = 10000
WHERE "id" = 'svc-barba' AND "price" = 10;

UPDATE "services" SET "price" = 22000
WHERE "id" = 'svc-combo' AND "price" = 22;
