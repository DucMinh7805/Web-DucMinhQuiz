const { google } = require('googleapis');
const path = require('path');

async function main() {
  const formId = String(process.env.DIAMONDQUIZ_FORM_ID || '').trim();
  if (!formId) throw new Error('Thiếu DIAMONDQUIZ_FORM_ID.');

  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), 'api', 'google-key.json'),
    scopes: ['https://www.googleapis.com/auth/forms.body.readonly']
  });
  const forms = google.forms({ version: 'v1', auth });
  const { data } = await forms.forms.get({ formId });
  const questions = (data.items || []).flatMap((item, itemIndex) => {
    const question = item.questionItem?.question;
    if (!question) return [];
    return [{
      index: itemIndex + 1,
      itemId: item.itemId,
      questionId: question.questionId,
      title: String(item.title || ''),
      kind: question.choiceQuestion ? 'choice' : question.textQuestion ? 'text' : 'other',
      choiceType: question.choiceQuestion?.type || null,
      options: (question.choiceQuestion?.options || []).map(option => option.value),
      correctAnswers: (question.grading?.correctAnswers?.answers || []).map(answer => answer.value)
    }];
  });
  const suspicious = questions.filter(question => {
    const asksForMultiple = /(?:ch[oọ]n\s+(?:nhi[eề]u|c[aá]c)\s+(?:[dđ][aá]p\s+[aá]n|l[uự]a\s+ch[oọ]n)|nhi[eề]u\s+[dđ][aá]p\s+[aá]n)/i.test(question.title);
    return asksForMultiple && question.correctAnswers.length < 2;
  });
  const multipleAnswers = questions.filter(question => question.correctAnswers.length > 1);
  const shortAnswers = questions.filter(question => question.kind === 'text');

  console.log(JSON.stringify({
    formId: data.formId,
    title: data.info?.title || '',
    questionCount: questions.length,
    multipleAnswerCount: multipleAnswers.length,
    multipleAnswers,
    suspiciousMultipleCount: suspicious.length,
    suspiciousMultiple: suspicious,
    shortAnswerCount: shortAnswers.length,
    shortAnswerWithoutKeyCount: shortAnswers.filter(question => question.correctAnswers.length === 0).length,
    shortAnswers
  }, null, 2));
}

main().catch(error => {
  console.error(error?.response?.data || error?.message || error);
  process.exitCode = 1;
});
