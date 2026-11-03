export interface PlacementTranslation {
  lang: string;
  instructions: Readonly<Record<'mcq' | 'listen_pick' | 'read_aloud' | 'free', string>>;
  items: Readonly<Record<string, string>>; // item id -> the Hindi line shown under the item
}

// Listening items have no Hindi line on purpose: it would give the answer away.
// Tier 4 has none either: advanced learners should not need it.
export const placementHi: PlacementTranslation = {
  lang: 'hi',
  instructions: {
    mcq: 'सही शब्द चुनिए।',
    listen_pick: 'सुनिए और चुनिए कि आपने क्या सुना।',
    read_aloud: 'इस वाक्य को ज़ोर से पढ़िए।',
    free: 'अपने दिन के बारे में कुछ वाक्य बोलिए।',
  },
  items: {
    'p1-1': 'वह एक शिक्षिका है।',
    'p1-2': 'मैं अपने परिवार के साथ रहता/रहती हूँ।',
    'p2-1': 'कल मैं बाज़ार गया/गई थी।',
    'p2-2': 'कल मैं अपने दोस्त के साथ बाज़ार गया/गई थी।',
    'p3-1': 'अगर मेरे पास ज़्यादा समय होता, तो मैं कोई और भाषा सीखता/सीखती।',
    'p3-2': 'मैं जनवरी से इस प्रोजेक्ट पर काम कर रहा/रही हूँ।',
    'p3-3': 'उसने डेडलाइन आगे बढ़ाने का सुझाव दिया।',
  },
};
