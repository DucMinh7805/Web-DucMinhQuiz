import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  areAnswersEquivalent,
  getStableQuestionId,
  isOptionCorrect
} from '../src/utils/answerUtils.js';
import { buildTransferContent, makePaymentCode } from '../src/utils/paymentReference.js';
import { resolveSubjectStages, STAGES } from '../src/data/stageMapping.js';

assert.equal(isOptionCorrect('A. Đáp án đúng', 0, 'A'), true);
assert.equal(isOptionCorrect('B. Đáp án sai', 1, 'A'), false);
assert.equal(isOptionCorrect('Đáp án đúng', 0, 'Đáp án đúng'), true);
assert.equal(areAnswersEquivalent(['B', 'A'], 'A|B'), true);
assert.equal(areAnswersEquivalent('A', 'A|B'), false);

const first = getStableQuestionId({ question: 'Câu hỏi không có ID?' }, 'noi-khoa', 'de-1');
const second = getStableQuestionId({ question: 'Câu hỏi không có ID?' }, 'noi-khoa', 'de-1');
assert.equal(first, second);
assert.equal(getStableQuestionId({ id: 'form-123' }, 'x', 'y'), 'form-123');

const gasUtils = fs.readFileSync(new URL('../Sheet WEB/DM Quiz/GAS_4_Utils.gs', import.meta.url), 'utf8');
const gasSync = fs.readFileSync(new URL('../Sheet WEB/DM Quiz/GAS_3_Sync.gs', import.meta.url), 'utf8');
const gasAuth = fs.readFileSync(new URL('../Sheet WEB/DM Quiz/GAS_User_Auth.gs', import.meta.url), 'utf8');
const gasAccessAdmin = fs.readFileSync(new URL('../Sheet WEB/DM Quiz/GAS_User_Access_Admin.gs', import.meta.url), 'utf8');
const gasApi = fs.readFileSync(new URL('../Sheet WEB/DM Quiz/GAS_5_Api.gs', import.meta.url), 'utf8');
const gasContentAdmin = fs.readFileSync(new URL('../Sheet WEB/DM Quiz/GAS_6_Content_Admin.gs', import.meta.url), 'utf8');
const questionsApi = fs.readFileSync(new URL('../api/quiz/questions.js', import.meta.url), 'utf8');
const manifestApi = fs.readFileSync(new URL('../api/quiz/manifest.js', import.meta.url), 'utf8');
const authMeApi = fs.readFileSync(new URL('../api/auth/me.js', import.meta.url), 'utf8');
const quizClient = fs.readFileSync(new URL('../src/services/quizApi.js', import.meta.url), 'utf8');
const refreshAccessApi = fs.readFileSync(new URL('../api/auth/refresh-access.js', import.meta.url), 'utf8');
const contentSyncApi = fs.readFileSync(new URL('../api/admin/content-sync.js', import.meta.url), 'utf8');
const unlockModal = fs.readFileSync(new URL('../src/components/Modals/UnlockSubjectModal.jsx', import.meta.url), 'utf8');
const mistakesNotebook = fs.readFileSync(new URL('../src/pages/MistakesNotebookPage.jsx', import.meta.url), 'utf8');
const migrationScript = fs.readFileSync(new URL('../scripts/migrate-dryrun.cjs', import.meta.url), 'utf8');
const knowledgeGraphPage = fs.readFileSync(new URL('../src/pages/KnowledgeGraphPage.jsx', import.meta.url), 'utf8');
const obsidianGraph = fs.readFileSync(new URL('../src/components/Graph/ObsidianGraph.jsx', import.meta.url), 'utf8');
const homePage = fs.readFileSync(new URL('../src/pages/HomePage.jsx', import.meta.url), 'utf8');
const profilePage = fs.readFileSync(new URL('../src/pages/ProfilePage.jsx', import.meta.url), 'utf8');
const floatingContactButton = fs.readFileSync(new URL('../src/components/Common/FloatingContactButton.jsx', import.meta.url), 'utf8');
const viteConfig = fs.readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
const gasContext = vm.createContext({ console });
vm.runInContext(`${gasUtils}\n${gasSync}`, gasContext);
const gasAccessContext = vm.createContext({ console });
vm.runInContext(gasAccessAdmin, gasAccessContext);

const longBookId = 'TONG_QUAN_NGANH_Y_TE_PHAP_LUAT_Y_TE_VTTU_2024';
assert.equal(buildTransferContent('0796989703', 'book', longBookId).length <= 50, true);
assert.equal(
  gasAccessContext.makePaymentCode_('book', longBookId),
  makePaymentCode('book', longBookId),
  'Web và trang cấp PRO phải dùng cùng mã đối soát'
);

assert.deepEqual(
  resolveSubjectStages({ id: 'NGOAI_CO_XUONG', name: 'Ngoại Cơ Xương', stages: ['y1_y3', 'y4_y6'] }),
  [STAGES.CLINICAL],
  'Conflicting API stages must be resolved from the clinical subject mapping'
);
assert.deepEqual(
  resolveSubjectStages({ id: 'SINH_LY', name: 'Sinh Lý', stages: ['y1_y3', 'y4_y6'] }),
  [STAGES.PRECLINICAL],
  'Conflicting API stages must be resolved from the preclinical subject mapping'
);
assert.deepEqual(resolveSubjectStages({ stages: ['y3'] }), [STAGES.PRECLINICAL]);
assert.deepEqual(resolveSubjectStages({ stages: ['y4'] }), [STAGES.CLINICAL]);

assert.deepEqual(
  JSON.parse(JSON.stringify(gasContext.parsePricingCell('99.000 đ'))),
  { valid: true, value: 99000 }
);
assert.deepEqual(
  JSON.parse(JSON.stringify(gasContext.parsePricingCell('Miễn phí'))),
  { valid: true, value: 0 }
);
assert.equal(gasContext.parsePricingCell('Giảm 20%').valid, false);
assert.equal(gasSync.includes("d.name !== deckName"), false, 'Delete logic must not remove same-name decks in other subjects');
assert.equal(gasSync.includes("normalizedStatus.indexOf('da xoa')"), true, 'Deleted rows must stay excluded on resync');
assert.equal(gasSync.includes("createContentBackupSet_('XoaDe'"), true, 'Delete flow must create a recoverable backup of database and source rows');
assert.equal(gasAuth.includes('function handleActivateCode'), true, 'Activation must be validated server-side');
assert.equal(gasAuth.includes("code.length >= 6"), false, 'Activation must not accept arbitrary six-character codes');
assert.equal(gasAuth.includes('isInternalRequest_(params)'), true, 'Activation codes must require the trusted server path');
assert.equal(gasAuth.includes('hashExistingPasswords'), true, 'Existing plaintext passwords must have a migration path');
assert.equal(gasAuth.includes('Đổi mật khẩu chỉ được thực hiện qua máy chủ MedQuiz'), true, 'Password change must reject public calls');
assert.equal(gasAuth.includes("if (!isPost)"), true, 'Account operations must never be accepted through URL query strings');
assert.equal(gasAuth.includes("action === 'checkphone') && !isInternalRequest_(params)"), true, 'Public GAS must not expose account enumeration');
assert.equal(gasAuth.includes('rowPass === rawPass'), true, 'A valid retained recovery password must repair a stale HMAC after pepper rotation');
assert.equal(gasAuth.includes("setValue(hashPasswordForStorage_(rawPass))"), true, 'Successful recovery login must regenerate the automatic password key');
assert.equal(gasAccessAdmin.includes("type + ':' + id"), true, 'Direct grants must namespace subject and book IDs');
assert.equal(gasAccessAdmin.includes('getDirectAccessEntitlements_'), true, 'Direct account grants must be included at login');
assert.equal(gasAccessAdmin.includes('createHtmlOutput(getAccessGrantSidebarHtml_())'), true, 'Access sidebar must not depend on a separately named HTML file');
assert.equal(gasAccessAdmin.includes('function renderAccessAdminWebApp_'), true, 'Access management must be available as a standalone GAS web page');
assert.equal(gasAccessAdmin.includes('function findAccessUserByPhone_'), true, 'Admin must verify an account by phone instead of browsing all users');
assert.equal(gasAccessAdmin.includes("item.itemType === 'subject'"), true, 'Subject and book choices must remain separate');
assert.equal(gasAccessAdmin.includes('items.filter(function(item) { return item.isPro; })'), true, 'Free items must not appear in the PRO grant form');
assert.equal(gasAccessAdmin.includes('assertAccessAdminPin_'), true, 'Standalone admin actions must require a server-side admin code');
assert.equal(gasAccessAdmin.includes('paymentCode: makePaymentCode_'), true, 'PRO catalog must expose the same payment reconciliation code shown on the web');
assert.equal(gasAccessAdmin.includes('function auditProBookDriveSecurity'), true, 'Admin must be able to audit PRO Drive sharing without changing permissions');
assert.equal(gasAccessAdmin.includes('getSharingAccess()'), true, 'Drive security audit must inspect actual file sharing state');
assert.equal(gasAccessAdmin.includes('CATALOG_CACHE_SECONDS: 30'), true, 'PRO catalog updates must not remain stale for ten minutes');
assert.equal(gasAccessAdmin.includes("getProperty('AUTH_SHEET_WEB_APP_URL')"), true, 'Admin link must use the explicitly configured active deployment URL');
assert.equal(gasAccessAdmin.includes('ScriptApp.getService().getUrl()'), false, 'Admin link must not guess an obsolete deployment URL');
assert.equal(fs.existsSync(new URL('../Sheet WEB/DM Quiz/GAS_User_Access_Admin.html', import.meta.url)), false, 'Unused access admin HTML file must stay deleted');
assert.equal(gasAuth.includes('Mã Khóa Xác Thực (Tự Động)'), true, 'Users sheet must keep a separate automatic password key column');
assert.equal(gasAuth.includes('Không hỗ trợ ALL'), true, 'Activation codes must be bound to exactly one item');
assert.equal(refreshAccessApi.includes('authenticateSheetSession(req)'), true, 'Access refresh must trust only the signed server session');
assert.equal(refreshAccessApi.includes("callAuthSheet('sessionprofile'"), true, 'Access refresh must reload grants from the account sheet');
assert.equal(unlockModal.includes('Mở môn học mới'), true, 'Manual payment flow must support direct account grants without activation codes');
assert.equal(unlockModal.includes('Mã đối soát:'), false, 'Customers must not see an internal reconciliation code');
assert.equal(unlockModal.includes('profile.php?id=61594039586612'), true, 'Payment support must link to the official Facebook Fanpage');
assert.equal(floatingContactButton.includes('profile.php?id=61594039586612'), true, 'Floating support button must link to the official Facebook Fanpage');
assert.equal(homePage.includes('.slice(0, 6)'), true, 'Homepage must show at most six featured subjects');
assert.equal(profilePage.includes('Số đề đã hoàn thành'), false, 'Profile summary must not show the completed quiz card');
assert.equal(profilePage.includes('max-w-[1440px]'), true, 'Profile content must use the wider desktop frame');
assert.equal(unlockModal.includes('addInfo='), true, 'Bank transfer QR must carry an account/item reconciliation memo');
assert.equal(contentSyncApi.includes("process.env.CONTENT_SYNC_SECRET"), true, 'Sheet-to-Mongo content sync must require a server secret');
assert.equal(contentSyncApi.includes("'deleteSubject'"), true, 'Content sync must support explicit subject deletion');
assert.equal(contentSyncApi.includes('pruneMissingManifestContent'), true, 'Full manifest sync must prune records removed from Sheet');
assert.equal(contentSyncApi.includes("syncManifest(req.body.manifest, { prune: true })"), true, 'Only a full manifest snapshot may prune stale Mongo content');
assert.equal(contentSyncApi.includes('Manifest không có môn học'), true, 'An empty manifest must fail closed before pruning');
assert.equal(mistakesNotebook.includes('subjectExpirations[`subject:${m.subjectId}`]'), true, 'Mistake retention must use the namespaced subject entitlement key');
assert.equal(unlockModal.includes("itemPriceFormatted = 'Chưa cấu hình giá'"), true, 'Payment must never invent a fallback amount');
assert.equal(gasContentAdmin.includes('QUIZ_ADMIN_DELETE_PIN'), true, 'Delete authority must be separate from editor authority');
assert.equal(gasContentAdmin.includes('createContentBackupSet_'), true, 'Content deletion must create recoverable backups');
assert.equal(gasContentAdmin.includes("confirmText || '').trim().toUpperCase() !== 'XOA DE'"), true, 'Deck deletion must require explicit confirmation text');
assert.equal(gasApi.includes('renderQuizContentAdminWebApp_'), true, 'Quiz Apps Script must serve the standalone content admin web page');
assert.equal(migrationScript.includes("process.argv.includes('--use-cache')"), true, 'Bulk migration must not silently reuse stale question cache');
assert.equal(gasApi.includes('Nội dung PRO chỉ được tải qua API máy chủ đã xác thực'), true, 'Public GAS must reject PRO decks');
assert.equal(gasApi.includes("if (!isPost) throw new Error"), true, 'Internal GAS actions must reject public GET requests');
assert.equal(questionsApi.includes('authenticateSheetSession(req)'), true, 'Questions API must authenticate PRO requests');
assert.equal(questionsApi.includes("sessionHasEntitlement(session, 'subject', subject.id)"), true, 'Questions API must authorize the exact subject');
assert.equal(questionsApi.includes('subject.pricingSynced !== true'), true, 'Unsynced pricing must fail closed');
assert.equal(questionsApi.includes("Cache-Control', 'private, no-store"), true, 'Question responses must never enter a shared cache');
assert.equal(authMeApi.includes("Cache-Control', 'private, no-store"), true, 'Authenticated profile responses must never enter a shared cache');
assert.equal(manifestApi.includes("link: ''"), true, 'Public manifest must not expose document links');
assert.equal(manifestApi.includes("Access-Control-Allow-Origin', '*'"), true, 'Public manifest CORS must not reflect arbitrary origins with credentials');
assert.equal(manifestApi.includes('item.pricingSynced !== true'), true, 'Manifest must fail closed before secure pricing sync');
assert.equal(quizClient.includes('action=getDeck'), false, 'Client must not bypass authorization through the public GAS deck fallback');
assert.equal(quizClient.includes('DEFAULT_SAMPLE_MANIFEST'), false, 'Production manifest must not silently fall back to stale sample data');
assert.equal(quizClient.includes("cache: 'no-store'"), true, 'Manifest requests must bypass stale browser caches');
assert.equal(knowledgeGraphPage.includes('subjects={subjects}'), true, 'Graph must receive normalized subjects so stage filters stay accurate');
assert.equal(obsidianGraph.includes(".distance(link => link.distance || 70)"), true, 'Graph simulation must apply the computed relationship distance');
assert.equal(obsidianGraph.includes('const activeNode = hoverNode || selectedNode'), true, 'Selected graph relationships must remain highlighted after hover ends');
assert.equal(obsidianGraph.includes('Number.isFinite(node.x)'), true, 'Canvas must skip nodes until the force engine assigns finite coordinates');
assert.equal(obsidianGraph.includes('hasFittedRef.current = true;'), true, 'Graph must perform a final fit after the force engine settles');
assert.equal(obsidianGraph.includes("nodeVal={node => node.type === 'root' ? 22 ** 2"), true, 'Graph fit bounds must match custom canvas node radii');
assert.equal(viteConfig.includes("'/api/quiz/manifest'"), true, 'Local Vite must proxy the public manifest endpoint');
assert.equal(viteConfig.includes("'/api/quiz/questions'"), true, 'Local Vite must proxy read-only quiz content requests');
assert.equal(viteConfig.includes("'/api':"), false, 'Local Vite must not proxy every API mutation to production');
assert.equal(viteConfig.includes('strictPort: true'), true, 'Local HMR must use a stable development port');
assert.equal(viteConfig.includes('clientPort: 5173'), true, 'Local HMR client must connect to the actual Vite port');

console.log('Critical logic tests passed.');
