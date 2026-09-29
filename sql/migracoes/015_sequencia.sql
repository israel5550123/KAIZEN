-- A sequência do ERP no pagamento e na parcela (_idsequencia): é ela que liga a parcela a receber ao pagamento que a
-- gerou (spec 2026-09-29-boleto-a-receber, seção 2). Na Link fica vazia.
alter table kaizen.documento_pagamento add column sequencia integer;
alter table kaizen.parcela add column sequencia integer;
