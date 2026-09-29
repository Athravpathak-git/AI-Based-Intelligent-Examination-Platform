/**
 * Comprehensive Academic Question and Option Multilingual Translation Engine for IntelliExamAI.
 * Supports 7 languages:
 * - en: English (default / original)
 * - mr: Marathi (मराठी)
 * - hi: Hindi (हिन्दी)
 * - te: Telugu (తెలుగు)
 * - ta: Tamil (தமிழ்)
 * - ml: Malayalam (മലയാളം)
 * - kn: Kannada (ಕನ್ನಡ)
 */

export interface QuestionLike {
  id?: number;
  question_text: string;
  translations?: Record<string, string>;
}

export interface OptionLike {
  id?: number;
  option_text: string;
  translations?: Record<string, string>;
}

export interface WrittenPromptLabels {
  label: string;
  placeholder: string;
}

// ============================================================================
// 1. DYNAMIC QUESTION PATTERN MATCHERS (33 ACADEMIC PATTERNS)
// ============================================================================
function matchDynamicQuestion(clean: string): Record<string, string> | null {
  // 1. Matrix Determinant
  const m1 = clean.match(/^Consider an invertible (\d+)x(\d+) real square matrix A with det\(A\) = (\d+) and matrix B with det\(B\) = (\d+)\. What is det\(A \* B\)\?$/);
  if (m1) {
    const [, dim, , a, b] = m1;
    return {
      en: clean,
      mr: `det(A) = ${a} आणि det(B) = ${b} असलेले व्युत्क्रमणीय (invertible) ${dim}x${dim} वास्तव चौरस मॅट्रिक्स A आणि B विचारात घ्या. det(A * B) चे मूल्य काय आहे?`,
      hi: `det(A) = ${a} और det(B) = ${b} वाले व्युत्क्रमणीय ${dim}x${dim} वास्तविक वर्ग आव्यूह A और B पर विचार करें। det(A * B) का मान क्या है?`,
      te: `det(A) = ${a} మరియు det(B) = ${b} కలిగిన విలోమ ${dim}x${dim} వాస్తవ చతురస్ర మాత్రికలు A మరియు B లను పరిగణించండి. det(A * B) విలువ ఎంత?`,
      ta: `det(A) = ${a} மற்றும் det(B) = ${b} கொண்ட நேர்மாறக்கூடிய ${dim}x${dim} மெய் சதுர அணிகள் A மற்றும் B ஐக் கருதுக. det(A * B) இன் மதிப்பு என்ன?`,
      ml: `det(A) = ${a}, det(B) = ${b} ആയ ഇൻവേർട്ടിബിൾ ${dim}x${dim} റിയൽ സ്ക്വയർ മാട്രിക്സ് A, B എന്നിവ പരിഗണിക്കുക. det(A * B) ന്റെ മൂല്യം എന്താണ്?`,
      kn: `det(A) = ${a} ಮತ್ತು det(B) = ${b} ಹೊಂದಿರುವ ವಿಲೋಮಿಸಬಹುದಾದ ${dim}x${dim} ನೈಜ ಚೌಕ మాత్రಿಕೆ A ಮತ್ತು B ಅನ್ನು ಪರಿಗಣಿಸಿ. det(A * B) ನ ಮೌಲ್ಯ ಎಷ್ಟು?`,
    };
  }

  // 2. Calculus Derivative of polynomial
  const m2 = clean.match(/^What is the first derivative of f\(x\) = (\d+)x\^(\d+) - (\d+)x with respect to x\?$/);
  if (m2) {
    const [, c, p, p2] = m2;
    return {
      en: clean,
      mr: `x च्या संदर्भात f(x) = ${c}x^{p} - ${p2}x चे पहिले अवकलज (first derivative) काय आहे?`,
      hi: `x के सापेक्ष f(x) = ${c}x^{p} - ${p2}x का प्रथम अवकलज (first derivative) क्या है?`,
      te: `x పరంగా f(x) = ${c}x^{p} - ${p2}x యొక్క మొదటి అవకలనం (first derivative) ఏమిటి?`,
      ta: `x ஐப் பொறுத்து f(x) = ${c}x^{p} - ${p2}x இன் முதல் வகைக்கெழு (first derivative) என்ன?`,
      ml: `x നെ സംബന്ധിച്ച് f(x) = ${c}x^{p} - ${p2}x ന്റെ ഒന്നാം ഡെറിവേറ്റീവ് എന്താണ്?`,
      kn: `x ಗೆ ಸಂಬಂಧಿಸಿದಂತೆ f(x) = ${c}x^{p} - ${p2}x ನ ಮೊದಲ ಉತ್ಪನ್ನ (first derivative) ಏನು?`,
    };
  }

  // 3. Dice probability
  const m3 = clean.match(/^In a fair (\d+)-sided die rolled twice, what is the theoretical probability of rolling a sum greater than or equal to (\d+)\?$/);
  if (m3) {
    const [, n, target] = m3;
    return {
      en: clean,
      mr: `दोनदा फेकलेल्या एका निष्पक्ष ${n}-बाजूंंच्या फाशावर (die), बेरीज ${target} किंवा त्याहून अधिक येण्याची संभाव्यता काय आहे?`,
      hi: `दो बार फेंके गए एक निष्पक्ष ${n}-फलकीय पासे में, योग ${target} या उससे अधिक आने की सैद्धांतिक प्रायिकता क्या है?`,
      te: `రెండుసార్లు దొర్లించిన నిష్పాక్షిక ${n}-వైపుల పాచికలో, మొత్తం ${target} లేదా అంతకంటే ఎక్కువ వచ్చే సంభావ్యత ఎంత?`,
      ta: `இருமுறை உருட்டப்பட்ட ஒரு நியாயமான ${n}-பக்க பகடையில், கூடுதல் ${target} அல்லது அதற்கு மேல் வருவதற்கான நிகழ்தகவு என்ன?`,
      ml: `രണ്ടുതവണ ഉരുട്ടിയ ഒരു ${n}-വശങ്ങളുള്ള ഡൈയിൽ, തുക ${target} അല്ലെങ്കിൽ അതിൽ കൂടുതലാകാനുള്ള സാധ്യത എന്താണ്?`,
      kn: `ಎರಡು ಬಾರಿ ಉರುಳಿಸಲಾದ ${n}-ಬದಿಗಳ ದಾಳದಲ್ಲಿ, ಮೊತ್ತವು ${target} ಅಥವಾ ಅದಕ್ಕಿಂತ ಹೆಚ್ಚಾಗುವ ಸಂಭವನೀಯತೆ ಎಷ್ಟು?`,
    };
  }

  // 4. Graph max edges
  const m4 = clean.match(/^What is the maximum number of edges in a simple undirected graph containing exactly (\d+) vertices\?$/);
  if (m4) {
    const [, v] = m4;
    return {
      en: clean,
      mr: `ंतंत ${v} शिरोबिंदू (vertices) असलेल्या साध्या अनभिमुख आलेखात (undirected graph) कडांची (edges) कमाल संख्या किती असू शकते?`,
      hi: `ठीक ${v} शीर्षों (vertices) वाले एक सरल अदिष्ट ग्राफ में किनारों (edges) की अधिकतम संख्या क्या है?`,
      te: `ఖచ్చితంగా ${v} శీర్షాలు కలిగిన సరళమైన దిశారహిత గ్రాఫ్‌లో గరిష్ట అంచుల (edges) సంఖ్య ఎంత?`,
      ta: `சரியாக ${v} உச்சிகளைக் கொண்ட எளிய திசையற்ற வரைபடத்தில் அதிகபட்ச விளிம்புகளின் எண்ணிக்கை என்ன?`,
      ml: `കൃത്യമായി ${v} ശീർഷങ്ങളുള്ള ഒരു ലളിതമായ അൺഡയറക്റ്റഡ് ഗ്രാഫിലെ പരമാവധി അരികുകളുടെ എണ്ണം എത്രയാണ്?`,
      kn: `ನಿಖರವಾಗಿ ${v} ಶೃಂಗಗಳನ್ನು ಹೊಂದಿರುವ ಸರಳ ನಿರ್ದೇಶಿತವಲ್ಲದ ಗ್ರಾಫ್‌ನಲ್ಲಿ ಗರಿಷ್ಠ ಅಂಚುಗಳ ಸಂಖ್ಯೆ ಎಷ್ಟು?`,
    };
  }

  // 5. Differential equation
  const m5 = clean.match(/^What is the general solution to the first-order homogeneous differential equation dy\/dx \+ (\d+)y = 0\?$/);
  if (m5) {
    const [, k] = m5;
    return {
      en: clean,
      mr: `dy/dx + ${k}y = 0 या प्रथम-क्रम समघाती अवकल समीकरणाचे सामान्य रूप (general solution) काय आहे?`,
      hi: `प्रथम-कोटि समघातीय अवकल समीकरण dy/dx + ${k}y = 0 का सामान्य हल क्या है?`,
      te: `మొదటి క్రమ సజాతీయ అవకలన సమీకరణం dy/dx + ${k}y = 0 కు సాధారణ పరిష్కారం ఏమిటి?`,
      ta: `முதல் வரிசை சமபடித்தான வகைக்கெழு சமன்பாடு dy/dx + ${k}y = 0 இன் பொதுவான தீர்வு என்ன?`,
      ml: `ഒന്നാം ഓർഡർ ഹോമോജീനിയസ് ഡിഫറൻഷ്യൽ സമവാക്യം dy/dx + ${k}y = 0 ന്റെ പൊതു പരിഹാരം എന്താണ്?`,
      kn: `ಮೊದಲ ಕ್ರಮಾಂಕದ ಏಕರೂಪದ ಡಿಫರೆನ್ಷಿಯಲ್ ಸಮೀಕರಣ dy/dx + ${k}y = 0 ನ ಸಾಮಾನ್ಯ ಪರಿಹಾರವೇನು?`,
    };
  }

  // 6. Binary tree max nodes
  const m6 = clean.match(/^What is the maximum number of nodes in a strictly binary tree of height (\d+) \(where height of a root-only tree is 1\)\?$/);
  if (m6) {
    const [, h] = m6;
    return {
      en: clean,
      mr: `${h} उंची असलेल्या परिपूर्ण बायनरी ट्रीमध्ये (जिथे फक्त रूटची उंची 1 आहे) नोड्सची कमाल संख्या किती असू शकते?`,
      hi: `${h} ऊंचाई वाले एक पूर्ण बाइनरी ट्री में (जहाँ केवल रूट की ऊंचाई 1 है) नोड्स की अधिकतम संख्या क्या है?`,
      te: `${h} ఎత్తు కలిగిన బైనరీ ట్రీలో (రూట్ ఎత్తు 1 ఉన్నప్పుడు) గరిష్ట నోడ్‌ల సంఖ్య ఎంత?`,
      ta: `${h} உயரம் கொண்ட பைனரி மரத்தில் அதிகபட்ச முனைகளின் எண்ணிக்கை என்ன?`,
      ml: `${h} ഉയരമുള്ള ഒരു ബൈനറി ട്രീയിലെ പരമാവധി നോഡുകളുടെ എണ്ണം എത്രയാണ്?`,
      kn: `${h} ಎತ್ತರದ ಬೈನರಿ ಟ್ರೀಯಲ್ಲಿ ಗರಿಷ್ಠ ನೋಡ್‌ಗಳ ಸಂಖ್ಯೆ ಎಷ್ಟು?`,
    };
  }

  // 7. Worst case time complexity
  const m7 = clean.match(/^What is the worst-case time complexity of (.+?) on a sorted array of size n\?$/);
  if (m7) {
    const [, algo] = m7;
    return {
      en: clean,
      mr: `n आकाराच्या क्रमबद्ध ॲरेवर (sorted array) ${algo} ची सर्वात वाईट वेळ जटिलता (worst-case time complexity) काय आहे?`,
      hi: `n आकार के सॉर्ट किए गए सरणी पर ${algo} की सबसे खराब स्थिति की समय जटिलता क्या है?`,
      te: `n పరిమాణంలో ఉన్న క్రమబద్ధీకరించిన శ్రేణిపై ${algo} యొక్క అత్యంత అధ్వాన్నమైన సమయ సంక్లిష్టత ఏమిటి?`,
      ta: `வரிசைப்படுத்தப்பட்ட n அளவு அணிவரிசையில் ${algo} இன் மிக மோசமான நேர சிக்கல்தன்மை என்ன?`,
      ml: `n വലുപ്പമുള്ള സോർട്ട് ചെയ്ത അറേയിൽ ${algo} ന്റെ വേഴ്സ്റ്റ്-കേസ് സമയ സങ്കീർണ്ണത എന്താണ്?`,
      kn: `ವಿಂಗಡಿಸಲಾದ n ಗಾತ್ರದ ಅರೇಯಲ್ಲಿ ${algo} ನ ಕೆಟ್ಟ ಸಂದರ್ಭದ ಸಮಯದ ಸಂಕೀರ್ಣತೆ ಏನು?`,
    };
  }

  // 8. Time complexity of algo
  const m8 = clean.match(/^What is the time complexity of (.+?) for an array of size n\?$/);
  if (m8) {
    const [, algo] = m8;
    return {
      en: clean,
      mr: `n आकाराच्या ॲरेसाठी ${algo} ची वेळ जटिलता (time complexity) काय आहे?`,
      hi: `n आकार की सरणी के लिए ${algo} की समय जटिलता क्या है?`,
      te: `n పరిమాణ శ్రేణి కోసం ${algo} యొక్క సమయ సంక్లిష్టత ఏమిటి?`,
      ta: `n அளவுள்ள அணிவரிசைக்கு ${algo} இன் நேர சிக்கல்தன்மை என்ன?`,
      ml: `n വലുപ്പമുള്ള അറേയ്ക്ക് ${algo} ന്റെ സമയ സങ്കീർണ്ണത എന്താണ്?`,
      kn: `n ಗಾತ್ರದ ಅರೇಗಾಗಿ ${algo} ನ ಸಮಯದ ಸಂಕೀರ್ಣತೆ ಏನು?`,
    };
  }

  // 9. Relational normal form
  const m9 = clean.match(/^In relational database design, which condition strictly characterizes (.+?)\?$/);
  if (m9) {
    const [, norm] = m9;
    return {
      en: clean,
      mr: `रिलेशनल डेटाबेस रचनेमध्ये, कोणती अट काटेकोरपणे ${norm} चे वैशिष्ट्य ठरवते?`,
      hi: `रिलेशनल डेटाबेस डिज़ाइन में, कौन सी स्थिति कड़ाई से ${norm} की विशेषता बताती है?`,
      te: `రిలేషనల్ డేటాబేస్ డిజైన్‌లో, ఏ షరతు ఖచ్చితంగా ${norm} ను వర్ణిస్తుంది?`,
      ta: `தொடர்புடைய தரவுத்தள வடிவமைப்பில், எந்த நிபந்தனை ${norm} ஐக் குறிக்கிறது?`,
      ml: `റിലേഷണൽ ഡാറ്റാബേസ് ഡിസൈനിൽ, ${norm} നെ കർശനമായി നിർവചിക്കുന്ന വ്യവസ്ഥ ഏതാണ്?`,
      kn: `ರಿಲೇಶನಲ್ ಡೇಟಾಬೇಸ್ ವಿನ್ಯಾಸದಲ್ಲಿ, ಯಾವ ಷರತ್ತು ಕಟ್ಟುನಿಟ್ಟಾಗಿ ${norm} ಅನ್ನು ನಿರೂಪಿಸುತ್ತದೆ?`,
    };
  }

  // 10. IPv4 subnet usable hosts
  const m10 = clean.match(/^In IPv4 networking, how many usable host IP addresses are available in a \/(\d+) subnet\?$/);
  if (m10) {
    const [, cidr] = m10;
    return {
      en: clean,
      mr: `IPv4 नेटवर्किंगमध्ये, /${cidr} सबनेटमध्ये किती वापरण्यायोग्य होस्ट आयपी (IP) पत्ते उपलब्ध असतात?`,
      hi: `IPv4 नेटवर्किंग में, एक /${cidr} सबनेट में कितने प्रयोग करने योग्य होस्ट IP पते उपलब्ध हैं?`,
      te: `IPv4 నెట్‌వర్కింగ్‌లో, /${cidr} సబ్‌నెట్‌లో ఎన్ని ఉపయోగించగల హోస్ట్ IP చిరునామాలు అందుబాటులో ఉన్నాయి?`,
      ta: `IPv4 நெட்வொர்க்கிங்கில், /${cidr} சப்நெட்டில் எத்தனை பயன்படுத்தக்கூடிய ஹோஸ்ட் ஐபி முகவரிகள் உள்ளன?`,
      ml: `IPv4 നെറ്റ്‌വർക്കിംഗിൽ, ഒരു /${cidr} സബ്നെറ്റിൽ എത്ര ഉപയോഗയോഗ്യമായ ഹോസ്റ്റ് IP വിലാസങ്ങൾ ലഭ്യമാണ്?`,
      kn: `IPv4 ನೆಟ್‌ವರ್ಕಿಂಗ್‌ನಲ್ಲಿ, /${cidr} ಸಬ್‌ನೆಟ್‌ನಲ್ಲಿ ಎಷ್ಟು ಬಳಸಬಹುದಾದ ಹೋಸ್ಟ್ IP ವಿಳಾಸಗಳು ಲಭ್ಯವಿವೆ?`,
    };
  }

  // 11. Kinetic energy
  const m11 = clean.match(/^An object of mass (\d+) kg travels at a constant velocity of (\d+) m\/s\. What is its translational kinetic energy\?$/);
  if (m11) {
    const [, mass, vel] = m11;
    return {
      en: clean,
      mr: `${mass} किलोग्रॅम वस्तुमान असलेली वस्तू ${vel} मीटर/सेकंद वेगाने प्रवास करते. तिची गतिज ऊर्जा (kinetic energy) काय आहे?`,
      hi: `${mass} किलोग्राम द्रव्यमान की एक वस्तु ${vel} मीटर/सेकंड के निरंतर वेग से चलती है। इसकी गतिज ऊर्जा क्या है?`,
      te: `${mass} కిలోల ద్రవ్యరాశి కలిగిన వస్తువు ${vel} మీ/సె స్థిర వేగంతో ప్రయాణిస్తుంది. దాని గతిజ శక్తి ఎంత?`,
      ta: `${mass} கிலோ எடையுள்ள பொருள் ${vel} மீ/வி சீரான திசைவேகத்தில் பயணிக்கிறது. அதன் இயக்க ஆற்றல் என்ன?`,
      ml: `${mass} കിലോഗ്രാം ഭാരമുള്ള ഒരു വസ്തു ${vel} m/s സ്ഥിരമായ വേഗതയിൽ സഞ്ചരിക്കുന്നു. അതിന്റെ ഗതികോർജ്ജം എത്രയാണ്?`,
      kn: `${mass} ಕೆಜಿ ದ್ರವ್ಯರಾಶಿಯ ವಸ್ತುವು ${vel} ಮೀ/ಸೆ ಸ್ಥಿರ ವೇಗದಲ್ಲಿ ಚಲಿಸುತ್ತದೆ. ಅದರ ಚಲನ ಶಕ್ತಿ ಎಷ್ಟು?`,
    };
  }

  // 12. Carnot efficiency
  const m12 = clean.match(/^A reversible Carnot heat engine operates between a hot reservoir at (\d+) K and a cold sink at (\d+) K\. What is its theoretical thermal efficiency\?$/);
  if (m12) {
    const [, th, tc] = m12;
    return {
      en: clean,
      mr: `एक कार्नो उष्णता इंजिन ${th} K च्या उष्ण स्रोतामध्ये आणि ${tc} K च्या थंड सिंकमध्ये कार्य करते. त्याची सैद्धांतिक थर्मल कार्यक्षमता काय आहे?`,
      hi: `एक प्रतिवर्ती कार्नो हीट इंजन ${th} K के गर्म जलाशय और ${tc} K के ठंडे सिंक के बीच कार्य करता है। इसकी सैद्धांतिक तापीय दक्षता क्या है?`,
      te: `ఒక కార్నోట్ హీట్ ఇంజిన్ ${th} K హాట్ రిజర్వాయర్ మరియు ${tc} K కోల్డ్ సింక్ మధ్య పనిచేస్తుంది. దాని ఉష్ణ సామర్థ్యం ఎంత?`,
      ta: `${th} K வெப்ப நீர்த்தேக்கம் மற்றும் ${tc} K குளிர் மூழ்கி இடையே இயங்கும் கார்னோ வெப்ப இயந்திரத்தின் வெப்பத் திறன் என்ன?`,
      ml: `${th} K ചൂടുള്ള റിസർവോയറിനും ${tc} K തണുത്ത സിങ്കിനും ഇടയിൽ പ്രവർത്തിക്കുന്ന കാർനോട്ട് എഞ്ചിന്റെ താപ കാര്യക്ഷമത എത്രയാണ്?`,
      kn: `${th} K ಬಿಸಿ ಜಲಾಶಯ ಮತ್ತು ${tc} K ತಂಪಾದ ಸಿಂಕ್ ನಡುವೆ ಕಾರ್ಯನಿರ್ವಹಿಸುವ ಕಾರ್ನೋಟ್ ಶಾಖ ಎಂಜಿನ್‌ನ ಉಷ್ಣ ದಕ್ಷತೆ ಎಷ್ಟು?`,
    };
  }

  // 13. Critical angle
  const m13 = clean.match(/^What is the critical angle for total internal reflection when light travels from a dense medium \(refractive index n = ([0-9.]+)\) into air \(n = 1\.0\)\?$/);
  if (m13) {
    const [, n2] = m13;
    return {
      en: clean,
      mr: `जेव्हा प्रकाश दाट माध्यमातून (अपवर्तनांक n = ${n2}) हवेमध्ये (n = 1.0) प्रवास करतो तेव्हा संपूर्ण अंतर्गत परावर्तनासाठी (TIR) क्रांतिक कोन (critical angle) काय आहे?`,
      hi: `जब प्रकाश सघन माध्यम (अपवर्तनांक n = ${n2}) से वायु (n = 1.0) में जाता है तो पूर्ण आंतरिक परावर्तन के लिए क्रांतिक कोण क्या है?`,
      te: `కాంతి సాంద్రత కలిగిన మాధ్యమం (వక్రీభవన గుణకం n = ${n2}) నుండి గాలిలోకి ప్రయాణించినప్పుడు సంపూర్ణ అంతర్గత పరావర్తనం కోసం సందిగ్ధ కోణం ఎంత?`,
      ta: `ஒளி அடர்ந்த ஊடகத்திலிருந்து (ஒளிவிலகல் எண் n = ${n2}) காற்றில் செல்லும் போது முழு அக எதிரொளிப்புக்கான மாறுநிலை கோணம் என்ன?`,
      ml: `പ്രകാശം ഒരു സാന്ദ്രതയുള്ള മാധ്യമത്തിൽ നിന്ന് (റിഫ്രാക്റ്റീവ് ഇൻഡക്സ് n = ${n2}) വായുവിലേക്ക് സഞ്ചരിക്കുമ്പോൾ പൂർണ്ണ ആന്തരിക പ്രതിഫലനത്തിനുള്ള ക്രിട്ടിക്കൽ ആംഗിൾ എന്താണ്?`,
      kn: `ಬೆಳಕು ಸಾಂದ್ರ ಮಾಧ್ಯಮದಿಂದ (ವಕ್ರೀಭವನ ಸೂಚ್ಯಂಕ n = ${n2}) ಗಾಳಿಗೆ ಚಲಿಸುವಾಗ ಒಟ್ಟು ಆಂತರಿಕ ಪ್ರತಿಫಲನಕ್ಕೆ ನಿರ್ಣಾಯಕ ಕೋನ ಎಷ್ಟು?`,
    };
  }

  // 14. Huckel rule
  const m14 = clean.match(/^According to Hückel's Rule, a planar, monocyclic, fully conjugated system is aromatic if it contains \(4n \+ 2\) pi electrons\. Does a system with (\d+) pi electrons satisfy this criteria\?$/);
  if (m14) {
    const [, pi] = m14;
    return {
      en: clean,
      mr: `ह्युकेलच्या नियमानुसार, जर प्रतलीय मोनोसायक्लिक प्रणालीमध्ये (4n + 2) पाय इलेक्ट्रॉन्स असतील तर ती सुगंधी (aromatic) असते. ${pi} पाय इलेक्ट्रॉन्स असलेली प्रणाली हे निकष पूर्ण करते का?`,
      hi: `हकल के नियम के अनुसार, यदि किसी समतलीय मोनोसाइक्लिक प्रणाली में (4n + 2) पाई इलेक्ट्रॉन हों तो वह एरोमैटिक होती है। क्या ${pi} पाई इलेक्ट्रॉनों वाली प्रणाली इस मानदंड को पूरा करती है?`,
      te: `హకెల్ నియమం ప్రకారం, (4n + 2) పై ఎలక్ట్రాన్లు ఉంటే అది సుగంధభరితం అవుతుంది. ${pi} పై ఎలక్ట్రాన్లు కలిగిన వ్యవస్థ ఈ ప్రమాణాన్ని సంతృప్తిపరుస్తుందా?`,
      ta: `ஹக்கல் விதியின்படி, (4n + 2) பை எலக்ட்ரான்களைக் கொண்டிருந்தால் அது நறுமணத்தன்மை கொண்டது. ${pi} பை எலக்ட்ரான்களைக் கொண்ட அமைப்பு இதை பூர்த்தி செய்கிறதா?`,
      ml: `ഹക്കൽ നിയമപ്രകാരം, (4n + 2) പൈ ഇലക്ട്രോണുകൾ ഉണ്ടെങ്കിൽ അത് ആരോമാറ്റിക് ആണ്. ${pi} പൈ ഇലക്ട്രോണുകളുള്ള ഒരു സിസ്റ്റം ഈ മാനദണ്ഡം പാലിക്കുന്നുണ്ടോ?`,
      kn: `ಹಕೆಲ್ ನಿಯಮದ ಪ್ರಕಾರ, (4n + 2) ಪೈ ಎಲೆಕ್ಟ್ರಾನ್‌ಗಳನ್ನು ಹೊಂದಿದ್ದರೆ ಅದು ಅರೋಮ್ಯಾಟಿಕ್ ಆಗಿದೆ. ${pi} ಪೈ ಎಲೆಕ್ಟ್ರಾನ್‌ಗಳನ್ನು ಹೊಂದಿರುವ ವ್ಯವಸ್ಥೆಯು ಈ ಮಾನದಂಡವನ್ನು ಪೂರೈಸುತ್ತದೆಯೇ?`,
    };
  }

  // 15. Electronegativity of element
  const m15 = clean.match(/^Which property describes why (.+?) exhibits high electronegativity on the Pauling scale\?$/);
  if (m15) {
    const [, elem] = m15;
    return {
      en: clean,
      mr: `पॉलिंग स्केलवर ${elem} उच्च विद्युतऋणता (electronegativity) का दर्शवते हे कोणत्या गुणधर्मावरून स्पष्ट होते?`,
      hi: `पॉलिंग पैमाने पर ${elem} उच्च विद्युत ऋणात्मकता क्यों प्रदर्शित करता है, यह किस गुण द्वारा वर्णित है?`,
      te: `పౌలింగ్ స్కేలుపై ${elem} అధిక ఎలక్ట్రోనెగటివిటీని ఎందుకు ప్రదర్శిస్తుందో ఏ లక్షణం వివరిస్తుంది?`,
      ta: `பாலிங் அளவுகோலில் ${elem} அதிக எலக்ட்ரான் கவர்தன்மையை வெளிப்படுத்துவதை எந்தப் பண்பு விவரிக்கிறது?`,
      ml: `പോളിംഗ് സ്കെയിലിൽ ${elem} ഉയർന്ന ഇലക്ട്രോനെഗറ്റിവിറ്റി കാണിക്കുന്നത് എന്തുകൊണ്ടാണെന്ന് ഏത് സവിശേഷതയാണ് വിശദീകരിക്കുന്നത്?`,
      kn: `ಪಾಲಿಂಗ್ ಮಾಪಕದಲ್ಲಿ ${elem} ಹೆಚ್ಚಿನ ಎಲೆಕ್ಟ್ರೋನೆಗಾಟಿವಿಟಿಯನ್ನು ಏಕೆ ಪ್ರದರ್ಶಿಸುತ್ತದೆ ಎಂಬುದನ್ನು ಯಾವ ಗುಣವು ವಿವರಿಸುತ್ತದೆ?`,
    };
  }

  // 16. Ocean trench
  const m16 = clean.match(/^Which trench is recognized as the deepest point in the world's oceans, located in the western (.+?) Ocean\?$/);
  if (m16) {
    const [, ocean] = m16;
    return {
      en: clean,
      mr: `पश्चिम ${ocean} महासागरात स्थित जगातील महासागरांचा सर्वात खोल बिंदू म्हणून कोणता खंदक (trench) ओळखला जातो?`,
      hi: `पश्चिमी ${ocean} महासागर में स्थित विश्व के महासागरों का सबसे गहरा बिंदु कौन सा गर्त (trench) है?`,
      te: `పశ్చిమ ${ocean} మహాసముద్రంలో ఉన్న ప్రపంచంలోనే అత్యంత లోతైన ప్రదేశంగా ఏ ట్రెంచ్ గుర్తించబడింది?`,
      ta: `மேற்கு ${ocean} பெருங்கடலில் அமைந்துள்ள உலகின் பெருங்கடல்களின் மிக ஆழமான புள்ளியாக எந்த அகழி அங்கீகரிக்கப்பட்டுள்ளது?`,
      ml: `പടിഞ്ഞാറൻ ${ocean} സമുദ്രത്തിൽ സ്ഥിതി ചെയ്യുന്ന, ലോകത്തിലെ സമുദ്രങ്ങളിലെ ഏറ്റവും ആഴമേറിയ പോയിന്റായി അംഗീകരിക്കപ്പെട്ട കിടങ്ങ് ഏതാണ്?`,
      kn: `ಪಶ್ಚಿಮ ${ocean} ಮಹಾಸಾಗರದಲ್ಲಿರುವ ವಿಶ್ವದ ಸಾಗರಗಳ ಅತ್ಯಂತ ಆಳವಾದ ಬಿಂದು ಎಂದು ಯಾವ ಕಂದಕ ಗುರುತಿಸಲ್ಪಟ್ಟಿದೆ?`,
    };
  }

  // 17. Indian Constitution Article
  const m17 = clean.match(/^Under the Indian Constitution, which fundamental freedom or constitutional remedy is guaranteed under Article (\d+)\?$/);
  if (m17) {
    const [, art] = m17;
    return {
      en: clean,
      mr: `भारतीय राज्यघटनेच्या कलम ${art} अन्वये कोणत्या मूलभूत हक्काची किंवा घटनात्मक उपायाची हमी दिली आहे?`,
      hi: `भारतीय संविधान के अनुच्छेद ${art} के तहत किस मौलिक अधिकार या संवैधानिक उपचार की गारंटी दी गई है?`,
      te: `భారత రాజ్యాంగంలోని ఆర్టికల్ ${art} కింద ఏ ప్రాథమిక హక్కు లేదా రాజ్యాంగ పరిహారం హామీ ఇవ్వబడింది?`,
      ta: `இந்திய அரசியலமைப்பின் ${art} வது பிரிவின் கீழ் எந்த அடிப்படை உரிமை அல்லது அரசியலமைப்பு தீர்வு உத்தரவாதம் செய்யப்பட்டுள்ளது?`,
      ml: `ഇന്ത്യൻ ഭരണഘടനയുടെ ${art}-ാം അനുച്ഛേദം ഉറപ്പുനൽകുന്ന മൗലികാവകാശം അല്ലെങ്കിൽ ഭരണഘടനാ പരിഹാരം ഏതാണ്?`,
      kn: `ಭಾರತೀಯ ಸಂವಿಧಾನದ ${art} ನೇ ವಿಧಿಯ ಅಡಿಯಲ್ಲಿ ಯಾವ ಮೂಲಭೂತ ಹಕ್ಕು ಅಥವಾ ಸಾಂವಿಧಾನಿಕ ಪರಿಹಾರವನ್ನು ಖಾತರಿಪಡಿಸಲಾಗಿದೆ?`,
    };
  }

  // 18. Arithmetic sequence next term
  const m18 = clean.match(/^Identify the next term in the arithmetic sequence: ([0-9, ]+), __\?$/);
  if (m18) {
    const [, seq] = m18;
    return {
      en: clean,
      mr: `अंकगणितीय श्रेणीतील पुढील पद ओळखा: ${seq}, __?`,
      hi: `अंकगणितीय अनुक्रम में अगला पद पहचानें: ${seq}, __?`,
      te: `అంకగణిత శ్రేణిలో తదుపరి పదాన్ని గుర్తించండి: ${seq}, __?`,
      ta: `கூட்டுத் தொடரின் அடுத்த உறுப்பைக் கண்டறியவும்: ${seq}, __?`,
      ml: `സമാന്തര ശ്രേണിയിലെ അടുത്ത പദം തിരിച്ചറിയുക: ${seq}, __?`,
      kn: `ಸಮಾಂತರ ಶ್ರೇಣಿಯ ಮುಂದಿನ ಪದವನ್ನು ಗುರುತಿಸಿ: ${seq}, __?`,
    };
  }

  // 19. Direction displacement
  const m19 = clean.match(/^A candidate walks (\d+) km North, turns right and walks (\d+) km East\. What is the shortest displacement from the starting point\?$/);
  if (m19) {
    const [, dn, de] = m19;
    return {
      en: clean,
      mr: `एक उमेदवार ${dn} किमी उत्तरेकडे चालतो, नंतर उजवीकडे वळून ${de} किमी पूर्वेकडे चालतो. सुरुवातीच्या बिंदूपासून सर्वात कमी अंतर (विस्थापन) किती आहे?`,
      hi: `एक उम्मीदवार ${dn} किमी उत्तर की ओर चलता है, दाएं मुड़ता है और ${de} किमी पूर्व की ओर चलता है। प्रारंभिक बिंदु से सबसे कम विस्थापन कितना है?`,
      te: `ఒక అభ్యర్థి ${dn} కి.మీ ఉత్తరం వైపు నడిచి, కుడివైపు తిరిగి ${de} కి.మీ తూర్పు వైపు నడుస్తాడు. ప్రారంభ స్థానం నుండి అతి తక్కువ దూరం ఎంత?`,
      ta: `ஒருவர் ${dn} கி.மீ வடக்கு நோக்கி நடந்து, வலதுபுறம் திரும்பி ${de} கி.மீ கிழக்கு நோக்கி நடக்கிறார். தொடக்கப் புள்ளியிலிருந்து குறைந்தபட்ச இடப்பெயர்ச்சி என்ன?`,
      ml: `ഒരു ഉദ്യോഗാർത്ഥി ${dn} കി.മീ വടക്കോട്ട് നടക്കുന്നു, വലത്തോട്ട് തിരിഞ്ഞ് ${de} കി.മീ കിഴക്കോട്ട് നടക്കുന്നു. ആരംഭ സ്ഥാനത്ത് നിന്നുള്ള ഏറ്റവും കുറഞ്ഞ ദൂരം എത്രയാണ്?`,
      kn: `ಒಬ್ಬ ಅಭ್ಯರ್ಥಿಯು ${dn} ಕಿಮೀ ಉತ್ತರಕ್ಕೆ ನಡೆದು, ಬಲಕ್ಕೆ ತಿರುಗಿ ${de} ಕಿಮೀ ಪೂರ್ವಕ್ಕೆ ನಡೆಯುತ್ತಾನೆ. ಆರಂಭಿಕ ಹಂತದಿಂದ ಕಡಿಮೆ ಸ್ಥಳಾಂತರ ಎಷ್ಟು?`,
    };
  }

  // 20. Vocabulary meaning
  const m20 = clean.match(/^Select the option that most accurately defines the meaning of the word '([A-Z]+)':$/);
  if (m20) {
    const [, word] = m20;
    return {
      en: clean,
      mr: `'${word}' या शब्दाचा अर्थ सर्वात अचूकपणे स्पष्ट करणारा पर्याय निवडा:`,
      hi: `'${word}' शब्द का सबसे सटीक अर्थ बताने वाला विकल्प चुनें:`,
      te: `'${word}' పదం యొక్క అర్థాన్ని అత్యంత ఖచ్చితంగా నిర్వచించే ఎంపికను ఎంచుకోండి:`,
      ta: `'${word}' என்ற வார்த்தையின் சரியான அர்த்தத்தை விவரிக்கும் விருப்பத்தைத் தேர்ந்தெடுக்கவும்:`,
      ml: `'${word}' എന്ന വാക്കിന്റെ അർത്ഥം ഏറ്റവും കൃത്യമായി നിർവചിക്കുന്ന ഓപ്ഷൻ തിരഞ്ഞെടുക്കുക:`,
      kn: `'${word}' ಪದದ ಅರ್ಥವನ್ನು ಅತ್ಯಂತ ನಿಖರವಾಗಿ ವ್ಯಾಖ್ಯಾನಿಸುವ ಆಯ್ಕೆಯನ್ನು ಆರಿಸಿ:`,
    };
  }

  // 21. Vocabulary antonym
  const m21 = clean.match(/^Identify the direct ANTONYM of the word '([A-Z]+)':$/);
  if (m21) {
    const [, word] = m21;
    return {
      en: clean,
      mr: `'${word}' या शब्दाचा थेट विरुद्धार्थी शब्द (antonym) ओळखा:`,
      hi: `'${word}' शब्द का सीधा विलोम शब्द (antonym) पहचानें:`,
      te: `'${word}' పదానికి వ్యతిరేక పదాన్ని గుర్తించండి:`,
      ta: `'${word}' என்ற வார்த்தையின் நேரடி எதிர்ச்சொல்லைக் கண்டறியவும்:`,
      ml: `'${word}' എന്ന വാക്കിന്റെ വിപരീത പദം തിരിച്ചറിയുക:`,
      kn: `'${word}' ಪದದ ನೇರ ವಿರುದ್ಧ ಪದವನ್ನು ಗುರುತಿಸಿ:`,
    };
  }

  // 22. Verb form
  const m22 = clean.match(/^Choose the grammatically correct verb form to complete the sentence: '(.+?) _____ ready for the final evaluation session\.'$/);
  if (m22) {
    const [, phrase] = m22;
    return {
      en: clean,
      mr: `वाक्य पूर्ण करण्यासाठी व्याकरणदृष्ट्या योग्य क्रियापद रूप निवडा: '${phrase} _____ ready for the final evaluation session.'`,
      hi: `वाक्य को पूरा करने के लिए व्याकरण की दृष्टि से सही क्रिया रूप चुनें: '${phrase} _____ ready for the final evaluation session.'`,
      te: `వాక్యాన్ని పూర్తి చేయడానికి సరైన క్రియా రూపాన్ని ఎంచుకోండి: '${phrase} _____ ready for the final evaluation session.'`,
      ta: `வாக்கியத்தை முடிக்க இலக்கண ரீதியாக சரியான வினைச்சொல்லைத் தேர்ந்தெடுக்கவும்: '${phrase} _____ ready for the final evaluation session.'`,
      ml: `വാക്യം പൂർത്തിയാക്കാൻ വ്യാകരണപരമായി ശരിയായ ക്രിയാരൂപം തിരഞ്ഞെടുക്കുക: '${phrase} _____ ready for the final evaluation session.'`,
      kn: `ವಾಕ್ಯವನ್ನು ಪೂರ್ಣಗೊಳಿಸಲು ವ್ಯಾಕರಣದ ಪ್ರಕಾರ ಸರಿಯಾದ ಕ್ರಿಯಾಪದ ರೂಪವನ್ನು ಆರಿಸಿ: '${phrase} _____ ready for the final evaluation session.'`,
    };
  }

  return null;
}

// ============================================================================
// 2. DYNAMIC OPTION PATTERN MATCHERS
// ============================================================================
function matchDynamicOption(clean: string): Record<string, string> | null {
  // Numeric Joules
  const m1 = clean.match(/^([0-9.]+) Joules$/);
  if (m1) {
    const val = m1[1];
    return {
      en: `${val} Joules`,
      mr: `${val} ज्यूल`,
      hi: `${val} जूल`,
      te: `${val} జూల్స్`,
      ta: `${val} ஜூல்ஸ்`,
      ml: `${val} ജൂൾസ്`,
      kn: `${val} ಜೂಲ್‌ಗಳು`,
    };
  }

  // Degrees
  const m2 = clean.match(/^([0-9.]+) degrees$/);
  if (m2) {
    const val = m2[1];
    return {
      en: `${val} degrees`,
      mr: `${val} अंश (degrees)`,
      hi: `${val} डिग्री`,
      te: `${val} డిగ్రీలు`,
      ta: `${val} பாகை (degrees)`,
      ml: `${val} ഡിഗ്രി`,
      kn: `${val} ಡಿಗ್ರಿ`,
    };
  }

  // Distance direction
  const m3 = clean.match(/^([0-9.]+) km (Northeast|North|East)$/);
  if (m3) {
    const [, dist, dirName] = m3;
    const dirMaps: Record<string, Record<string, string>> = {
      Northeast: { mr: "ईशान्य", hi: "उत्तर-पूर्व", te: "ఈశాన్యం", ta: "வடகிழக்கு", ml: "വടക്കുകിഴക്ക്", kn: "ಈಶಾನ್ಯ" },
      North: { mr: "उत्तर", hi: "उत्तर", te: "ఉత్తరం", ta: "வடக்கு", ml: "വടക്ക്", kn: "ಉತ್ತರ" },
      East: { mr: "पूर्व", hi: "पूर्व", te: "తూర్పు", ta: "கிழக்கு", ml: "കിഴക്ക്", kn: "ಪೂರ್ವ" },
    };
    const d = dirMaps[dirName] || { mr: dirName, hi: dirName, te: dirName, ta: dirName, ml: dirName, kn: dirName };
    return {
      en: clean,
      mr: `${dist} किमी ${d.mr}`,
      hi: `${dist} किमी ${d.hi}`,
      te: `${dist} కి.మీ ${d.te}`,
      ta: `${dist} கி.மீ ${d.ta}`,
      ml: `${dist} കി.മീ ${d.ml}`,
      kn: `${dist} ಕಿಮೀ ${d.kn}`,
    };
  }

  // Huckel yes n = ...
  const m4 = clean.match(/^Yes, corresponds to n = (\d+)\.$/);
  if (m4) {
    const n = m4[1];
    return {
      en: clean,
      mr: `होय, हे n = ${n} ला अनुरूप आहे.`,
      hi: `हाँ, यह n = ${n} से मेल खाता है।`,
      te: `అవును, ఇది n = ${n} కి అనుగుణంగా ఉంటుంది.`,
      ta: `ஆம், n = ${n} உடன் ஒத்துள்ளது.`,
      ml: `അതെ, n = ${n} എന്നതിന് തുല്യമാണ്.`,
      kn: `ಹೌದು, ಇದು n = ${n} ಗೆ ಅನುರೂಪವಾಗಿದೆ.`,
    };
  }

  return null;
}

// ============================================================================
// 3. PUBLIC ACCESSORS
// ============================================================================
export function getLocalizedQuestionText(
  question: QuestionLike | null | undefined,
  language: string
): string {
  if (!question || !question.question_text) return "";
  if (language === "en") return question.question_text;

  // 1. Check server-provided translations
  if (question.translations && question.translations[language]) {
    return question.translations[language];
  }

  const clean = question.question_text.trim();

  // 2. Check dynamic pattern matching
  const matched = matchDynamicQuestion(clean);
  if (matched && matched[language]) {
    return matched[language];
  }

  // 3. Safe fallback to original English
  return question.question_text;
}

export function getLocalizedOptionText(
  option: OptionLike | null | undefined,
  language: string
): string {
  if (!option || !option.option_text) return "";
  if (language === "en") return option.option_text;

  // 1. Check server-provided translations
  if (option.translations && option.translations[language]) {
    return option.translations[language];
  }

  const clean = option.option_text.trim();

  // 2. Check dynamic pattern matching
  const matched = matchDynamicOption(clean);
  if (matched && matched[language]) {
    return matched[language];
  }

  // 3. Safe fallback to original English
  return option.option_text;
}

/**
 * Localized prompts for written questions (Short Answer / Long Answer)
 */
export function getWrittenPromptLabels(
  questionType: string,
  language: string
): WrittenPromptLabels {
  const isShort = questionType === "SHORT_ANSWER";

  const labels: Record<string, { shortLabel: string; longLabel: string; shortPlaceholder: string; longPlaceholder: string }> = {
    en: {
      shortLabel: "Your Written Response (Max 100 words)",
      longLabel: "Your Written Response (Min 10, Max 600 words)",
      shortPlaceholder: "Type your short answer (maximum 100 words)...",
      longPlaceholder: "Provide comprehensive reasoning and explanation (10 to 600 words)...",
    },
    mr: {
      shortLabel: "तुमचे लिखित उत्तर (कमाल 100 शब्द)",
      longLabel: "तुमचे सविस्तर उत्तर (किमान 10, कमाल 600 शब्द)",
      shortPlaceholder: "तुमचे संक्षिप्त उत्तर येथे टाइप करा (कमाल 100 शब्द)...",
      longPlaceholder: "सविस्तर स्पष्टीकरण आणि विश्लेषण लिहा (10 ते 600 शब्द)...",
    },
    hi: {
      shortLabel: "आपका लिखित उत्तर (अधिकतम 100 शब्द)",
      longLabel: "आपका विस्तृत उत्तर (न्यूनतम 10, अधिकतम 600 शब्द)",
      shortPlaceholder: "अपना संक्षिप्त उत्तर यहां लिखें (अधिकतम 100 शब्द)...",
      longPlaceholder: "विस्तृत विवरण और तर्क प्रस्तुत करें (10 से 600 शब्द)...",
    },
    te: {
      shortLabel: "మీ లిఖితపూర్వక సమాధానం (గరిష్టంగా 100 పదాలు)",
      longLabel: "మీ సమగ్ర సమాధానం (కనిష్టంగా 10, గరిష్టంగా 600 పదాలు)",
      shortPlaceholder: "మీ సంక్షిప్త సమాధానాన్ని నమోదు చేయండి (గరిష్టంగా 100 పదాలు)...",
      longPlaceholder: "వివరణాత్మక కారణాలు మరియు వివరణ రాయండి (10 నుండి 600 పదాలు)...",
    },
    ta: {
      shortLabel: "உங்கள் எழுத்துப்பூர்வ பதில் (அதிகபட்சம் 100 சொற்கள்)",
      longLabel: "உங்கள் விரிவான பதில் (குறைந்தபட்சம் 10, அதிகபட்சம் 600 சொற்கள்)",
      shortPlaceholder: "உங்கள் குறுகிய பதிலை தட்டச்சு செய்யவும் (அதிகபட்சம் 100 சொற்கள்)...",
      longPlaceholder: "முழுமையான விளக்கம் மற்றும் காரணங்களை வழங்கவும் (10 முதல் 600 சொற்கள்)...",
    },
    ml: {
      shortLabel: "നിങ്ങളുടെ എഴുത്തുപരമായ മറുപടി (പരമാവധി 100 വാക്കുകൾ)",
      longLabel: "നിങ്ങളുടെ വിശദമായ മറുപടി (കുറഞ്ഞത് 10, പരമാവധി 600 വാക്കുകൾ)",
      shortPlaceholder: "നിങ്ങളുടെ ചുരുങ്ങിയ ഉത്തരം ഇവിടെ ടൈപ്പ് ചെയ്യുക (പരമാവധി 100 വാക്കുകൾ)...",
      longPlaceholder: "വിശദമായ ന്യായീകരണവും വിശദീകരണവും നൽകുക (10 മുതൽ 600 വാക്കുകൾ)...",
    },
    kn: {
      shortLabel: "ನಿಮ್ಮ ಲಿಖಿತ ಪ್ರತಿಕ್ರಿಯೆ (ಗರಿಷ್ಠ 100 ಪದಗಳು)",
      longLabel: "ನಿಮ್ಮ ವಿವರವಾದ ಪ್ರತಿಕ್ರಿಯೆ (ಕನಿಷ್ಠ 10, ಗರಿಷ್ಠ 600 ಪದಗಳು)",
      shortPlaceholder: "ನಿಮ್ಮ ಸಂಕ್ಷಿಪ್ತ ಉತ್ತರವನ್ನು ಟೈಪ್ ಮಾಡಿ (ಗರಿಷ್ಠ 100 ಪದಗಳು)...",
      longPlaceholder: "ಸಮಗ್ರ ವಿವರಣೆ ಮತ್ತು ಕಾರಣಗಳನ್ನು ಒದಗಿಸಿ (10 ರಿಂದ 600 ಪದಗಳು)...",
    },
  };

  const current = labels[language] || labels.en;
  return {
    label: isShort ? current.shortLabel : current.longLabel,
    placeholder: isShort ? current.shortPlaceholder : current.longPlaceholder,
  };
}
