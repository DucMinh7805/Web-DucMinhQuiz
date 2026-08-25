const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

async function test() {
  const keyPath = path.join(process.cwd(), 'api', 'google-key.json');
  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: [
      'https://www.googleapis.com/auth/forms.body.readonly',
      'https://www.googleapis.com/auth/forms.responses.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly'
    ],
  });

  const formId = "1Sh-Rc0-5hnEiXyGDbPzPqzZxO3NBH-DOme69uqCTZXs";

  try {
    console.log("Ðang th? g?i Google Forms API...");
    const formsClient = google.forms({ version: 'v1', auth });
    const formData = await formsClient.forms.get({ formId });
    console.log("? L?y Form THÀNH CÔNG! Title:", formData.data.info.title);
    
    // Tìm các câu h?i có hình ?nh
    let imageCount = 0;
    const itemsWithImages = [];

    formData.data.items.forEach(item => {
      let hasImg = false;
      if (item.imageItem) {
        hasImg = true;
        imageCount++;
      } else if (item.questionItem && item.questionItem.image) {
        hasImg = true;
        imageCount++;
      }
      // Check options for images
      if (item.questionItem && item.questionItem.question && item.questionItem.question.choiceQuestion) {
          item.questionItem.question.choiceQuestion.options.forEach(opt => {
              if (opt.image) {
                  hasImg = true;
                  imageCount++;
              }
          });
      }
      
      if (hasImg) itemsWithImages.push(item.title);
    });
    console.log(`Tìm th?y ${imageCount} kh?i hình ?nh trong Form này.`);
    if (imageCount > 0) {
        console.log("M?t s? câu h?i có ?nh: ", itemsWithImages.slice(0, 3).join(', '));
    }
    
    // Luu ra file log d? xem c?u trúc
    fs.writeFileSync('form-data.json', JSON.stringify(formData.data, null, 2));
    console.log("Ðã luu chi ti?t vào form-data.json");
    
  } catch (err) {
    console.error("? L?i g?i Forms API:", err.message);
  }
}

test();
