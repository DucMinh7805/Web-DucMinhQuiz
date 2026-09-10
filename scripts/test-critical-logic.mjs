import assert from 'node:assert/strict';
import { compareQuestionDraft, normalizeEditorQuestion, validateQuestionDraft } from '../shared/questionInspection.js';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  areAnswersEquivalent,
  evaluateQuestionAnswer,
  getStableQuestionId,
  isOptionCorrect,
  QUESTION_EVALUATION
} from '../src/utils/answerUtils.js';
import { buildTransferContent, makePaymentCode } from '../src/utils/paymentReference.js';
import { resolveSubjectStages, STAGES } from '../src/data/stageMapping.js';
import { enforceGlobalApiRateLimit } from '../api/_utils/rateLimiter.js';
import { createPublicQuestionId } from '../api/_utils/questionIdentity.js';
import { getOptimizedQuestionImageUrl, getQuestionImageVariants } from '../api/_utils/imageUrl.js';
import { formatSubjectName } from '../src/utils/subjectName.js';
import { mergeMistakes, mergeProgress, normalizeMistakes } from '../shared/userDataMerge.js';
import { isValidVietnamesePhone, normalizePhone } from '../api/_utils/normalize.js';
import { hashPassword, isLegacyPasswordHash, verifyPassword } from '../api/_utils/passwordHash.js';
import { safelyDecodeURIComponent } from '../shared/routePath.js';

assert.equal(isOptionCorrect('A. Đáp án đúng', 0, 'A'), true);
assert.equal(isOptionCorrect('B. Đáp án sai', 1, 'A'), false);
assert.equal(isOptionCorrect('Đáp án đúng', 0, 'Đáp án đúng'), true);
assert.equal(areAnswersEquivalent(['B', 'A'], 'A|B'), true);
assert.equal(areAnswersEquivalent('A', 'A|B'), false);
assert.equal(
  evaluateQuestionAnswer({ type: 'short_answer', answer: 'Cơ hoành|Hoành cách mô' }, 'cơ hoành'),
  QUESTION_EVALUATION.CORRECT
);
assert.equal(
  evaluateQuestionAnswer({ type: 'short_answer', answer: 'Cơ hoành' }, 'Cơ'),
  QUESTION_EVALUATION.INCORRECT,
  'Short answers must not pass on partial text'
);
assert.equal(
  evaluateQuestionAnswer({ type: 'short_answer', answer: '' }, 'Bất kỳ câu trả lời nào'),
  QUESTION_EVALUATION.UNGRADED,
  'Short answers without a rubric must not be counted correct or wrong'
);

const first = getStableQuestionId({ question: 'Câu hỏi không có ID?' }, 'noi-khoa', 'de-1');
const second = getStableQuestionId({ question: 'Câu hỏi không có ID?' }, 'noi-khoa', 'de-1');
assert.equal(first, second);
assert.equal(getStableQuestionId({ id: 'form-123' }, 'x', 'y'), 'form-123');
assert.equal(
  createPublicQuestionId({ sourceQuestionId: 'form-1:item-7', qId: 'legacy', deckPath: 'noi-co-so/de-1' }),
  createPublicQuestionId({ sourceQuestionId: 'form-1:item-7', qId: 'changed', deckPath: 'noi-co-so/de-1' }),
  'Public question IDs must remain stable when the legacy position ID changes'
);
assert.match(createPublicQuestionId({ sourceQuestionId: 'form-1:item-7', deckPath: 'noi-co-so/de-1' }), /^DQ-NCS-[A-Z0-9]{6}$/);
assert.equal(
  getOptimizedQuestionImageUrl('https://lh7-rt.googleusercontent.com/formsz/example=s2048?key=x'),
  'https://lh7-rt.googleusercontent.com/formsz/example=w800?key=x'
);
assert.deepEqual(
  getQuestionImageVariants({ thumbnailUrl: '', fullResUrl: '', caption: '' }),
  { thumbnailUrl: '', fullResUrl: '', caption: '' },
  'An empty image object must not become the literal string [object Object]'
);
assert.equal(formatSubjectName('NOI_CO_SO', { subjects: [{ id: 'noi_co_so', name: 'Nội Cơ Sở' }] }), 'Nội Cơ Sở');
assert.equal(formatSubjectName('Noi Co So'), 'Nội cơ sở');
assert.equal(normalizePhone('+84 912 345 678'), '0912345678');
assert.equal(isValidVietnamesePhone('0912 345 678'), true);
assert.equal(isValidVietnamesePhone('0|12345678'), false, 'Phone validation must not treat | as a valid mobile prefix');
assert.deepEqual(
  mergeProgress({ noi: { deck1: { score: 5, date: '2026-01-01' } } }, { noi: null, ngoai: 'invalid' }),
  { noi: { deck1: { score: 5, date: '2026-01-01' } } },
  'Malformed progress payloads must be ignored instead of crashing the API'
);
assert.deepEqual(normalizeMistakes({ id: 'invalid-container' }), [], 'Mistakes must be an array');
assert.deepEqual(
  mergeMistakes([{ id: 'q1', date: '2026-01-01' }], [{ id: 'q1', date: '2026-02-01' }, null]),
  [{ id: 'q1', date: '2026-02-01' }],
  'The newest valid mistake must win during cross-device merge'
);
const securePasswordHash = await hashPassword('mat-khau-thu');
assert.equal(isLegacyPasswordHash(securePasswordHash), false);
assert.equal(await verifyPassword('0912345678', 'mat-khau-thu', securePasswordHash), true);
assert.equal(await verifyPassword('0912345678', 'sai-mat-khau', securePasswordHash), false);
assert.equal(safelyDecodeURIComponent('noi%2Ftim-mach'), 'noi/tim-mach');
assert.equal(safelyDecodeURIComponent('noi%2'), 'noi%2', 'Malformed route encoding must not crash the app');

const gasUtils = fs.readFileSync(new URL('../Sheet WEB/DM Quiz/GAS_4_Utils.gs', import.meta.url), 'utf8');
const gasSync = fs.readFileSync(new URL('../Sheet WEB/DM Quiz/GAS_3_Sync.gs', import.meta.url), 'utf8');
const gasAuth = fs.readFileSync(new URL('../Sheet WEB/DM Quiz/GAS_User_Auth.gs', import.meta.url), 'utf8');
const gasAccessAdmin = fs.readFileSync(new URL('../Sheet WEB/DM Quiz/GAS_User_Access_Admin.gs', import.meta.url), 'utf8');
const gasApi = fs.readFileSync(new URL('../Sheet WEB/DM Quiz/GAS_5_Api.gs', import.meta.url), 'utf8');
const gasContentAdmin = fs.readFileSync(new URL('../Sheet WEB/DM Quiz/GAS_6_Content_Admin.gs', import.meta.url), 'utf8');
const gasAnswerKeySystem = fs.readFileSync(new URL('../Sheet WEB/DM Quiz/GAS_7_Answer_Key_System.gs', import.meta.url), 'utf8');
const gasMenu = fs.readFileSync(new URL('../Sheet WEB/DM Quiz/GAS_1_Menu.gs', import.meta.url), 'utf8');
const questionsApi = fs.readFileSync(new URL('../api/quiz/questions.js', import.meta.url), 'utf8');
const manifestApi = fs.readFileSync(new URL('../api/quiz/manifest.js', import.meta.url), 'utf8');
const sheetLoginApi = fs.readFileSync(new URL('../api/auth/sheet-login.js', import.meta.url), 'utf8');
const sheetRegisterApi = fs.readFileSync(new URL('../api/auth/sheet-register.js', import.meta.url), 'utf8');
const databaseUtils = fs.readFileSync(new URL('../api/_utils/db.js', import.meta.url), 'utf8');
const questionCard = fs.readFileSync(new URL('../src/components/Quiz/QuestionCard.jsx', import.meta.url), 'utf8');
const authMeApi = fs.readFileSync(new URL('../api/auth/me.js', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const quizClient = fs.readFileSync(new URL('../src/services/quizApi.js', import.meta.url), 'utf8');
const networkStatusBanner = fs.readFileSync(new URL('../src/components/Common/NetworkStatusBanner.jsx', import.meta.url), 'utf8');
const refreshAccessApi = fs.readFileSync(new URL('../api/auth/refresh-access.js', import.meta.url), 'utf8');
const updateProfileApi = fs.readFileSync(new URL('../api/auth/update-profile.js', import.meta.url), 'utf8');
const authContext = fs.readFileSync(new URL('../src/context/AuthContext.jsx', import.meta.url), 'utf8');
const homeHero = fs.readFileSync(new URL('../src/components/Home/HomeHero.jsx', import.meta.url), 'utf8');
const windowsFileTree = fs.readFileSync(new URL('../src/components/Tree/WindowsFileTree.jsx', import.meta.url), 'utf8');
const contentSyncApi = fs.readFileSync(new URL('../api/admin/content-sync.js', import.meta.url), 'utf8');
assert.match(contentSyncApi, /isPublished:\s*subject\?\.isPublished !== false/);
const unlockModal = fs.readFileSync(new URL('../src/components/Modals/UnlockSubjectModal.jsx', import.meta.url), 'utf8');
const mistakesNotebook = fs.readFileSync(new URL('../src/pages/MistakesNotebookPage.jsx', import.meta.url), 'utf8');
const migrationScript = fs.readFileSync(new URL('../scripts/migrate-dryrun.cjs', import.meta.url), 'utf8');
const knowledgeGraphPage = fs.readFileSync(new URL('../src/pages/KnowledgeGraphPage.jsx', import.meta.url), 'utf8');
const obsidianGraph = fs.readFileSync(new URL('../src/components/Graph/ObsidianGraph.jsx', import.meta.url), 'utf8');
const homePage = fs.readFileSync(new URL('../src/pages/HomePage.jsx', import.meta.url), 'utf8');
const profilePage = fs.readFileSync(new URL('../src/pages/ProfilePage.jsx', import.meta.url), 'utf8');
const floatingContactButton = fs.readFileSync(new URL('../src/components/Common/FloatingContactButton.jsx', import.meta.url), 'utf8');
const viteConfig = fs.readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
const rateLimiter = fs.readFileSync(new URL('../api/_utils/rateLimiter.js', import.meta.url), 'utf8');
const gasContext = vm.createContext({ console });
vm.runInContext(`${gasUtils}\n${gasSync}\n${gasAnswerKeySystem}`, gasContext);
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
  resolveSubjectStages({ id: 'MON_MOI', name: 'Kỹ năng học tập', categoryName: 'Tiền lâm sàng' }),
  [STAGES.PRECLINICAL],
  'The phrase lâm sàng inside tiền lâm sàng must not force a subject into Y4-Y6'
);

assert.deepEqual(
  JSON.parse(JSON.stringify(gasContext.parsePricingCell('99.000 đ'))),
  { valid: true, value: 99000 }
);
assert.deepEqual(
  JSON.parse(JSON.stringify(gasContext.parsePricingCell('Miễn phí'))),
  { valid: true, value: 0 }
);
assert.equal(gasContext.parsePricingCell('Giảm 20%').valid, false);
assert.equal(gasContext.getFormEntryId_([null, null, null, null, [[123456789]]]), '123456789');
const mockCorrectChoices = [
  { isCorrectAnswer: () => true, getValue: () => 'Ho ra máu → Thuyên tắc phổi' },
  { isCorrectAnswer: () => true, getValue: () => 'Khò khè → Hen hoặc COPD' },
  { isCorrectAnswer: () => false, getValue: () => 'Đau đầu → Ngộ độc paracetamol' }
];
assert.deepEqual(
  JSON.parse(JSON.stringify(gasContext.getCorrectChoiceValues_(mockCorrectChoices))),
  ['Ho ra máu → Thuyên tắc phổi', 'Khò khè → Hen hoặc COPD'],
  'A Google Form item with multiple marked answers must retain every correct choice'
);
assert.equal(
  gasContext.isMultipleAnswerQuestion_('A|B', 'RADIO'),
  true,
  'Two marked answer-key values must force checkbox rendering even for a RADIO item'
);
assert.equal(gasContext.isMultipleAnswerQuestion_('A', 'CHECKBOX'), true, 'A Google Form CHECKBOX stays a checkbox');
assert.equal(gasContext.isMultipleAnswerQuestion_('', 'RADIO'), false, 'Question wording must never invent multiple answers');
assert.deepEqual(
  JSON.parse(JSON.stringify(gasContext.mergeUniqueAnswerValues_(['A', 'B', 'C'], ['A']))),
  ['A', 'B', 'C'],
  'The complete Forms API key must not be truncated by FormApp partial results'
);
const repairedAnswerKeys = gasContext.applyRestAnswerKeysToQuestions_([
  { question: 'Câu vận động khuỷu', type: 'multiple', answer: 'A', imageUrl: 'keep-me' },
  { question: 'Chi tiết giải phẫu', type: 'short_answer', answer: '' }
], [
  { title: 'Câu vận động khuỷu', kind: 'choice', choiceType: 'RADIO', answers: ['A', 'B', 'D'] },
  { title: 'Chi tiết giải phẫu', kind: 'text', choiceType: '', answers: ['Cơ hoành', 'Hoành cách mô'] }
]);
assert.equal(repairedAnswerKeys.issues.length, 0);
assert.equal(repairedAnswerKeys.questions[0].type, 'multiple');
assert.equal(repairedAnswerKeys.questions[0].answer, 'A|B|D');
assert.equal(repairedAnswerKeys.questions[0].imageUrl, 'keep-me', 'Answer repair must preserve images and question content');
assert.equal(repairedAnswerKeys.questions[1].answer, 'Cơ hoành|Hoành cách mô');
assert.equal(
  gasContext.findScrapedImageUrl_([['1AbCdEfGhIjKlMnOpQrStUv']], 0),
  'https://lh3.googleusercontent.com/d/1AbCdEfGhIjKlMnOpQrStUv=w1200'
);
assert.equal(gasSync.includes("d.name !== deckName"), false, 'Delete logic must not remove same-name decks in other subjects');
assert.equal(gasUtils.includes('imageMapByEntryId'), true, 'Form images must be matched to the stable Google Form entry ID');
assert.equal(gasUtils.includes('answerMapByEntryId'), true, 'Answer keys must be matched to the stable Google Form entry ID');
assert.equal(gasUtils.includes('https://forms.googleapis.com/v1/forms/'), true, 'Google Forms REST API must be the authoritative answer-key source');
assert.equal(gasUtils.includes('grading.correctAnswers'), true, 'Choice and text answers must come from grading.correctAnswers');
assert.equal(gasUtils.includes('ScriptApp.getOAuthToken()'), true, 'Apps Script must authenticate its Forms API request');
assert.equal(gasUtils.includes("'X-Goog-User-Project': 'tokyo-saga-470416-g7'"), true, 'Forms API quota must use the enabled DiamondQuiz Cloud project');
assert.equal(gasUtils.includes('getFormEntryId_(it)'), true, 'Scraped Form payload must expose entry IDs for matching');
assert.equal(gasUtils.includes('Array.isArray(grading[3])'), true, 'Short-answer Quiz grading rules must be read from the dedicated payload path');
assert.equal(gasUtils.includes('findScrapedImageUrl_(it[4][0][1], 0)'), true, 'Inline question or option images need a grading-payload fallback');
assert.equal(gasUtils.includes('imageMapByIndex[qIdx]'), true, 'Legacy Forms without entry IDs need an index fallback');
assert.equal(gasUtils.includes('fileCache = null'), true, 'Drive image lookup must reuse the shared in-memory file cache');
assert.equal(gasMenu.includes('Đồng bộ các đề đang bôi đen (khuyên dùng)'), true, 'Selective sync must be visible inside the data-sync menu');
assert.equal(gasMenu.includes('Sửa barem toàn hệ thống (Forms API)'), true, 'The answer-key repair workflow must be accessible from the Sheet menu');
assert.equal(gasAnswerKeySystem.includes("handler: 'continueAnswerKeyRepair_'"), true, 'Bulk answer repair must resume through a time trigger');
assert.equal(gasAnswerKeySystem.includes('applyRestAnswerKeysToQuestions_'), true, 'Bulk repair must update existing decks without reprocessing images');
assert.equal(gasSync.includes('MAX_SELECTED_DECKS_PER_RUN = 10'), true, 'Selective sync must cap batches before Apps Script times out');
assert.equal(gasSync.includes('if (elapsed > 210)'), true, 'Selective sync must save completed decks before the Apps Script execution limit');
assert.equal(gasSync.includes('count < 2500'), false, 'Selective sync must not scan thousands of Drive images before processing a deck');
assert.equal(gasSync.includes('Đang chuẩn bị đồng bộ'), true, 'Selected rows must show immediate progress in column E');
assert.equal(gasSync.includes("SpreadsheetApp.getUi().alert(timedOutEarly"), false, 'Completion feedback must not block Apps Script until its six-minute timeout');
assert.equal(sheetLoginApi.includes('verifyPassword(phone, password, cachedUser.passwordHash)'), true, 'Cached passwords must be verified through the migration-safe password helper');
assert.equal(sheetLoginApi.includes('isLegacyPasswordHash(cachedUser.passwordHash)'), true, 'Successful legacy logins must upgrade the fast password hash');
assert.equal(sheetLoginApi.includes('Grace period'), false, 'Login must never create a session without verifying a password');
assert.equal(sheetRegisterApi.includes('scheduleBackgroundTask'), true, 'Registration Sheet sync must use the Vercel background lifecycle');
assert.equal(sheetRegisterApi.includes("requireSecurityValue('SHEET_SESSION_SECRET'"), true, 'Registration must fail before creating a partial account when security configuration is missing');
assert.equal(
  sheetRegisterApi.indexOf('await User.create') < sheetRegisterApi.indexOf("callAuthSheet("),
  true,
  'MongoDB must create the account before background Sheet synchronization starts'
);
assert.equal(databaseUtils.includes('maxPoolSize: 10'), true, 'Each Vercel instance must use a bounded MongoDB pool');
assert.equal(databaseUtils.includes('minPoolSize: 0'), true, 'Idle serverless instances must not pin MongoDB connections');
assert.equal(questionCard.includes("if (mode === 'exam') onSelectOption(nextValue)"), true, 'Exam short-answer drafts must save before navigation');
assert.equal(questionCard.includes('/chọn nhiều|nhiều đáp án|các đáp án|nhiều lựa chọn/i'), false, 'Frontend must not infer answer type from wording');
assert.equal(gasSync.includes("normalizedStatus.indexOf('da xoa')"), true, 'Deleted rows must stay excluded on resync');
assert.equal(gasSync.includes("createContentBackupSet_('XoaDe'"), false, 'Selected deck deletion must be permanent and must not create backup sheets');
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
assert.equal(updateProfileApi.includes('authenticateSheetSession(req)'), true, 'Profile updates must require a signed session');
assert.equal(updateProfileApi.includes("callAuthSheet('updateprofile'"), true, 'Profile edits must sync through the private Sheet gateway');
assert.equal(updateProfileApi.includes('User.findOneAndUpdate'), true, 'Profile edits must update the MongoDB login record as well as the account Sheet');
assert.equal(gasAuth.includes('function handleUpdateProfile'), true, 'The account Sheet must support profile updates');
assert.equal(gasAuth.includes('migrateAccountPhone_'), true, 'Changing phone must preserve existing PRO entitlements');
assert.equal(authContext.includes('updateAccountProfile'), true, 'Verified profile changes must replace client account data');
assert.equal(authContext.includes('removeUserData(user.phone)'), true, 'Changing phone must migrate local progress away from the old account key');
assert.equal(unlockModal.includes('Mở môn học mới'), true, 'Manual payment flow must support direct account grants without activation codes');
assert.equal(unlockModal.includes('Mã đối soát:'), false, 'Customers must not see an internal reconciliation code');
assert.equal(unlockModal.includes('profile.php?id=61594039586612'), true, 'Payment support must link to the official Facebook Fanpage');
assert.equal(floatingContactButton.includes('profile.php?id=61594039586612'), true, 'Floating support button must link to the official Facebook Fanpage');
assert.equal(homePage.includes('.slice(0, 6)'), true, 'Homepage must show at most six featured subjects');
assert.equal(profilePage.includes('Số đề đã hoàn thành'), false, 'Profile summary must not show the completed quiz card');
assert.equal(profilePage.includes('max-w-[1440px]'), true, 'Profile content must use the wider desktop frame');
assert.equal(profilePage.includes('Chỉnh sửa hồ sơ'), true, 'Profile must expose an account editor');
assert.equal(profilePage.includes('subject:${subId}'), true, 'Profile expiry lookup must use namespaced entitlement keys');
assert.equal(homeHero.includes("sessionStorage.getItem('diamondquiz:home-stats-animated')"), true, 'Home counters must animate once per browser session');
assert.equal(homeHero.includes('src="/diamond_quiz.png"'), true, 'The hero must use the requested DiamondQuiz logo');
assert.equal(windowsFileTree.includes('Mặc định chọn môn đầu tiên khi load'), false, 'Tree view must wait for an explicit subject selection');
assert.equal(windowsFileTree.includes('PRO'), true, 'Paid subjects must keep a visible PRO tag');
assert.equal(unlockModal.includes('addInfo='), true, 'Bank transfer QR must carry an account/item reconciliation memo');
assert.equal(contentSyncApi.includes("process.env.CONTENT_SYNC_SECRET"), true, 'Sheet-to-Mongo content sync must require a server secret');
assert.equal(contentSyncApi.includes('hasMultiKeyword'), false, 'Mongo normalization must not infer answer type from wording');
assert.equal(contentSyncApi.includes('checkbox không có đáp án đúng'), true, 'Publishing must fail closed for an empty checkbox answer key');
assert.equal(contentSyncApi.includes("'deleteSubject'"), true, 'Content sync must support explicit subject deletion');
assert.equal(contentSyncApi.includes('pruneMissingManifestContent'), true, 'Full manifest sync must prune records removed from Sheet');
assert.equal(contentSyncApi.includes("syncManifest(req.body.manifest, { prune: true })"), true, 'Only a full manifest snapshot may prune stale Mongo content');
assert.equal(contentSyncApi.includes('Manifest không có môn học'), true, 'An empty manifest must fail closed before pruning');
assert.equal(mistakesNotebook.includes('subjectExpirations[`subject:${m.subjectId}`]'), true, 'Mistake retention must use the namespaced subject entitlement key');
assert.equal(unlockModal.includes("itemPriceFormatted = 'Chưa cấu hình giá'"), true, 'Payment must never invent a fallback amount');
assert.equal(gasContentAdmin.includes('QUIZ_ADMIN_DELETE_PIN'), true, 'Delete authority must be separate from editor authority');
assert.equal(gasContentAdmin.includes('createContentBackupSet_'), false, 'Content deletion must not create backup sheets');
assert.equal(gasContentAdmin.includes("createContentBackupSet_('XoaDe'"), false, 'Admin deck deletion must be permanent and must not create backup sheets');
assert.equal(gasContentAdmin.includes("confirmText || '').trim().toUpperCase() !== 'XOA DE'"), true, 'Deck deletion must require explicit confirmation text');
assert.equal(gasContentAdmin.includes('markDeckSourcesDeleted_(upSheet, subject.name, subject.decks || [])'), true, 'Subject deletion must update deck source statuses in one batch');
assert.equal(gasApi.includes('renderQuizContentAdminWebApp_'), true, 'Quiz Apps Script must serve the standalone content admin web page');
assert.equal(migrationScript.includes("process.argv.includes('--use-cache')"), true, 'Bulk migration must not silently reuse stale question cache');
assert.equal(gasApi.includes('Nội dung PRO chỉ được tải qua API máy chủ đã xác thực'), true, 'Public GAS must reject PRO decks');
assert.equal(gasApi.includes("if (!isPost) throw new Error"), true, 'Internal GAS actions must reject public GET requests');
assert.equal(questionsApi.includes('authenticateSheetSession(req)'), true, 'Questions API must authenticate PRO requests');
assert.equal(questionsApi.includes("sessionHasEntitlement(session, 'subject', subject.id)"), true, 'Questions API must authorize the exact subject');
assert.equal(questionsApi.includes('subject.pricingSynced !== true'), true, 'Unsynced pricing must fail closed');
assert.equal(questionsApi.includes("Cache-Control', 'private, no-store"), true, 'Question responses must never enter a shared cache');
assert.equal(questionsApi.includes('hasRevision'), true, 'Versioned free questions must use a cache key that changes after synchronization');
assert.equal(questionsApi.includes("'public, max-age=0, s-maxage=10'"), true, 'Unversioned clients must not receive stale questions for several minutes');
assert.equal(questionsApi.includes('deckId: deck._id'), true, 'Question lookup must use the indexed deck ID');
assert.equal(questionsApi.includes('$regex'), false, 'Quiz reads must not use case-insensitive regex scans');
assert.equal(authMeApi.includes("Cache-Control', 'private, no-store"), true, 'Authenticated profile responses must never enter a shared cache');
assert.equal(manifestApi.includes("link: ''"), true, 'Public manifest must not expose document links');
assert.equal(manifestApi.includes("Access-Control-Allow-Origin', '*'"), true, 'Public manifest CORS must not reflect arbitrary origins with credentials');
assert.equal(manifestApi.includes("req.method !== 'GET'"), true, 'Public manifest must reject unsupported write methods');
assert.equal(manifestApi.includes('item.pricingSynced !== true'), true, 'Manifest must fail closed before secure pricing sync');
assert.equal(quizClient.includes('action=getDeck'), false, 'Client must not bypass authorization through the public GAS deck fallback');
assert.equal(quizClient.includes('DEFAULT_SAMPLE_MANIFEST'), false, 'Production manifest must not silently fall back to stale sample data');
assert.equal(manifestApi.includes('Promise.all(['), true, 'Independent manifest collections must be loaded in parallel');
assert.equal(manifestApi.includes("s-maxage=10"), true, 'Public manifest must expose synchronized deck revisions quickly');
assert.equal(manifestApi.includes('revision: new Date(deck.updatedAt'), true, 'Every deck must expose a revision for cache busting');
assert.equal(quizClient.includes("params.set('revision'"), true, 'Question requests must include the synchronized deck revision');
assert.equal(appSource.includes("queryKey: ['deck', deckPath, deckRevision]"), true, 'React Query must separate old and newly synchronized deck versions');
assert.equal(appSource.includes("refetchOnWindowFocus: true"), true, 'Returning from Sheets must refresh a stale manifest');
assert.equal(quizClient.includes('_t=${Date.now()}'), false, 'Client must not defeat safe CDN caching with timestamp query strings');
assert.equal(networkStatusBanner.includes("window.addEventListener('offline'"), true, 'The UI must notify users immediately when connectivity is lost');
assert.equal(networkStatusBanner.includes("window.addEventListener('online'"), true, 'The UI must confirm when connectivity returns');
assert.equal(networkStatusBanner.includes('fixed inset-0 z-[9999]'), true, 'Offline mode must block the full application surface');
assert.equal(networkStatusBanner.includes('src="/diamond_quiz.png"'), true, 'Offline mode must show the full DiamondQuiz brand asset');
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

const mockRateLimitResponse = () => ({
  statusCode: 200,
  headers: {},
  payload: null,
  setHeader(name, value) { this.headers[name] = value; },
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.payload = payload; return this; }
});
let finalRateLimitResponse;
for (let requestIndex = 0; requestIndex <= 600; requestIndex += 1) {
  finalRateLimitResponse = mockRateLimitResponse();
  enforceGlobalApiRateLimit({
    method: 'GET',
    url: '/api/auth/me',
    headers: { 'x-forwarded-for': '203.0.113.42' },
    socket: {}
  }, finalRateLimitResponse);
}
assert.equal(finalRateLimitResponse.statusCode, 429, 'The global API limiter must return HTTP 429 after the policy limit');
assert.equal(Boolean(finalRateLimitResponse.headers['Retry-After']), true, 'Rate-limited clients must receive Retry-After');
assert.equal(rateLimiter.includes('MAX_TRACKED_KEYS = 20000'), true, 'Rate-limit memory must have a hard key cap');
const apiHandlerFiles = [
  'admin/content-sync.js', 'admin/content.js', 'library/book-link.js', 'quiz/manifest.js', 'quiz/questions.js',
  'user/progress.js', 'auth/me.js', 'auth/refresh-access.js', 'auth/activate-code.js',
  'auth/sheet-login.js', 'auth/sheet-register.js', 'auth/update-profile.js'
];
apiHandlerFiles.forEach(relativePath => {
  const source = fs.readFileSync(new URL(`../api/${relativePath}`, import.meta.url), 'utf8');
  assert.equal(source.includes('enforceGlobalApiRateLimit(req, res)'), true, `${relativePath} must use the global API rate limiter`);
});

const inspectedDraft = normalizeEditorQuestion({ question: 'Câu kiểm tra?', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: true }] });
assert.equal(inspectedDraft.type, 'multiple', 'Answer map must infer multiple-answer questions');
assert.equal(validateQuestionDraft(inspectedDraft).valid, true, 'A complete answer map must pass pre-publish validation');
const majorChange = compareQuestionDraft({ question: 'Câu cũ?', options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }] }, inspectedDraft);
assert.equal(majorChange.suggestedMode, 'replace', 'Large semantic changes must suggest Replace');
const contentSyncSource = fs.readFileSync(new URL('../api/admin/content-sync.js', import.meta.url), 'utf8');
assert.equal(contentSyncSource.includes('Question.deleteMany'), false, 'Source sync must never hard-delete questions');
assert.equal(contentSyncSource.includes('Deck.deleteMany'), false, 'Source sync must never hard-delete decks');

console.log('Critical logic tests passed.');
