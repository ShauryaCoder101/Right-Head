require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  const model = genAI.getGenerativeModel({
    model: 'models/gemini-2.5-flash',
    systemInstruction: 'You parse resumes into JSON. Output ONLY a JSON object with keys: name, email, phone, skills (array), total_experience_years (number), education (array of {degree, field, institution}), work_experience (array of {company, title, duration_months}). No markdown, no explanation.',
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent(
    'Parse this resume: VISHAL SINGH - 6.5 years experience in Defence Sales, PMO, Tendering, Procurement. Masters in Statistics & Economics. Worked at ABC Corp as Senior Manager (3 years), XYZ Ltd as Business Dev Manager (2 years), DEF Inc as Procurement Officer (1.5 years). Skills: Procurement, Tendering, Government Liaison, MS Office, SAP, Business Development, Compliance.'
  );

  const text = result.response.text();
  console.log('Raw response length:', text.length);
  console.log('Raw response:', text);
  
  try {
    const parsed = JSON.parse(text);
    console.log('\n✅ PARSED SUCCESSFULLY!');
    console.log('Name:', parsed.name);
    console.log('Skills:', parsed.skills?.length, 'skills');
    console.log('Experience:', parsed.total_experience_years, 'years');
  } catch (e) {
    console.log('\n❌ JSON PARSE FAILED:', e.message);
  }
}

test().catch(e => console.error('Fatal:', e.message));
