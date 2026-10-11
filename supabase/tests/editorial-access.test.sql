BEGIN;
SELECT plan(17);
INSERT INTO auth.users(id) VALUES
('00000000-0000-0000-0000-000000000011'),
('00000000-0000-0000-0000-000000000012'),
('00000000-0000-0000-0000-000000000013');
INSERT INTO public.db_records(id,type,nome,created_by) OVERRIDING SYSTEM VALUE
VALUES (91001,'pessoa','Pessoa teste','00000000-0000-0000-0000-000000000011');
INSERT INTO public.db_record_notes(id,record_id,body,created_by) OVERRIDING SYSTEM VALUE
VALUES (91001,91001,'Nota teste','00000000-0000-0000-0000-000000000011');
SET LOCAL ROLE anon;
SELECT throws_ok('SELECT * FROM db_records','42501',NULL,'anon cannot read records');
SELECT throws_ok('SELECT * FROM db_record_notes','42501',NULL,'anon cannot read notes');
RESET ROLE;
SET LOCAL request.jwt.claim.sub='00000000-0000-0000-0000-000000000013';
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::integer FROM db_records),0,'ordinary member cannot read');
SELECT is((SELECT count(*)::integer FROM db_record_notes),0,'ordinary member cannot read notes');
SELECT throws_ok($$INSERT INTO db_records(type,nome,created_by) VALUES ('pessoa','Intruso',auth.uid())$$,'42501',NULL,'ordinary member cannot insert');
SELECT throws_ok('INSERT INTO editorial_members(user_id) VALUES (auth.uid())','42501',NULL,'no self promotion');
RESET ROLE;
INSERT INTO editorial_members(user_id) VALUES
('00000000-0000-0000-0000-000000000011'),('00000000-0000-0000-0000-000000000012');
SET LOCAL request.jwt.claim.sub='00000000-0000-0000-0000-000000000012';
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::integer FROM editorial_members),1,'membership exposes only self');
SELECT is((SELECT count(*)::integer FROM db_records),1,'editor reads shared records');
SELECT lives_ok($$UPDATE db_records SET nome='Nome editado' WHERE id=91001$$,'editor edits shared record');
SELECT throws_ok($$UPDATE db_records SET created_by=auth.uid() WHERE id=91001$$,'42501',NULL,'cannot replace original author');
SELECT lives_ok($$INSERT INTO db_records(type,nome,created_by) VALUES ('pessoa','Segundo',auth.uid())$$,'editor inserts own record');
SELECT throws_ok($$INSERT INTO db_records(type,nome,created_by) VALUES ('pessoa','Forjado','00000000-0000-0000-0000-000000000011')$$,'42501',NULL,'cannot forge author');
UPDATE db_record_notes SET body='Forjado' WHERE id=91001;
SELECT is((SELECT body FROM db_record_notes WHERE id=91001),'Nota teste','cannot edit another author note');
DELETE FROM db_record_notes WHERE id=91001;
SELECT is((SELECT count(*)::integer FROM db_record_notes WHERE id=91001),1,'cannot delete another author note');
RESET ROLE;
SET LOCAL request.jwt.claim.sub='00000000-0000-0000-0000-000000000011';
SET LOCAL ROLE authenticated;
SELECT lives_ok($$UPDATE db_record_notes SET body='Editada' WHERE id=91001$$,'note author can edit');
RESET ROLE;
DELETE FROM editorial_members WHERE user_id='00000000-0000-0000-0000-000000000011';
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::integer FROM db_records),0,'revocation is immediate without JWT refresh');
SELECT throws_ok($$INSERT INTO db_record_notes(record_id,body,created_by) VALUES (91001,'Intruso',auth.uid())$$,'42501',NULL,'revoked editor cannot add notes');
SELECT * FROM finish();
ROLLBACK;
