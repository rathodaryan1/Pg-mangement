import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'hi' | 'gu';

export interface Translations {
  [key: string]: {
    en: string;
    hi: string;
    gu: string;
  };
}

export const DICTIONARY: Translations = {
  // Navigation & General
  dashboard: { en: 'Dashboard', hi: 'डैशबोर्ड', gu: 'ડેશબોર્ડ' },
  properties: { en: 'Properties', hi: 'प्रॉपर्टीज', gu: 'પ્રોપર્ટીઝ' },
  rooms: { en: 'Rooms & Beds', hi: 'कमरे और बिस्तर', gu: 'રૂમ અને પલંગ' },
  residents: { en: 'Residents', hi: 'निवासी', gu: 'રહેવાસીઓ' },
  payments: { en: 'Payments', hi: 'भुगतान', gu: 'ચુકવણીઓ' },
  maintenance: { en: 'Maintenance', hi: 'रखरखाव', gu: 'જાળવણી' },
  visitors: { en: 'Visitors & Gate', hi: 'आगंतुक और गेट', gu: 'મુલાકાતીઓ અને ગેટ' },
  kitchen: { en: 'Kitchen & Mess', hi: 'रसोई और मेस', gu: 'રસોડું અને મેસ' },
  housekeeping: { en: 'Housekeeping', hi: 'हाउसकीपिंग', gu: 'હાઉસકીપિંગ' },
  leads: { en: 'Leads & Admissions', hi: 'पूछताछ और प्रवेश', gu: 'પૂછપરછ અને પ્રવેશ' },
  utilities: { en: 'Utilities & Meters', hi: 'बिजली व पानी मीटर', gu: 'લાઈટ અને પાણી મીટર' },
  parcels: { en: 'Parcels & Courier', hi: 'पार्सल और कूरियर', gu: 'પાર્સલ અને કુરિયર' },
  assets: { en: 'Assets & Vendors', hi: 'उपकरण और विक्रेता', gu: 'સાધનો અને વેપારીઓ' },
  commandCenter: { en: 'Command Center', hi: 'कमांड सेंटर', gu: 'કમાન્ડ સેન્ટર' },
  logout: { en: 'Sign Out', hi: 'लॉग आउट', gu: 'લૉગ આઉટ' },
  search: { en: 'Search...', hi: 'खोजें...', gu: 'શોધો...' },
  save: { en: 'Save Changes', hi: 'सुरक्षित करें', gu: 'સાચવો' },
  cancel: { en: 'Cancel', hi: 'रद्द करें', gu: 'રદ કરો' },
  refresh: { en: 'Refresh', hi: 'ताज़ा करें', gu: 'રીફ્રેશ' },
  status: { en: 'Status', hi: 'स्थिति', gu: 'સ્થિતિ' },
  available: { en: 'Available', hi: 'उपलब्ध', gu: 'ઉપલબ્ધ' },
  occupied: { en: 'Occupied', hi: 'भरा हुआ', gu: 'ભરેલું' },
  reserved: { en: 'Reserved', hi: 'आरक्षित', gu: 'રિઝર્વ્ડ' },
  pending: { en: 'Pending', hi: 'लंबित', gu: 'બાકી' },
  completed: { en: 'Completed', hi: 'पूर्ण', gu: 'પૂર્ણ' },
  overdue: { en: 'Overdue', hi: 'अतिदेय', gu: 'મુદતવીતી' },
  rentDue: { en: 'Rent Due', hi: 'किराया बाकी', gu: 'ભાડું બાકી' },
  todayMenu: { en: "Today's Menu", hi: 'आज का भोजन मेनू', gu: 'આજનું મેનૂ' },
  optIn: { en: 'Opt-In Meal', hi: 'भोजन लें', gu: 'જમવાનું પસંદ કરો' },
  optOut: { en: 'Skip Meal', hi: 'भोजन छोड़ें', gu: 'જમવાનું રદ કરો' },
  scanQr: { en: 'Scan QR Gate Pass', hi: 'गेट पास क्यूआर स्कैन करें', gu: 'ગેટ પાસ ક્યુઆર સ્કેન કરો' },
  emergencySos: { en: 'Emergency SOS', hi: 'आपातकालीन एसओएस', gu: 'ઇમરજન્સી એસઓએસ' },
  staff: { en: 'Staff & Workforce', hi: 'कर्मचारी और कार्यबल', gu: 'કર્મચારી અને વર્કફોર્સ' },
  compliance: { en: 'Compliance & Safety', hi: 'अनुपालन और सुरक्षा', gu: 'પાલન અને સુરક્ષા' },
  agreements: { en: 'Agreements', hi: 'अनुबंध और समझौते', gu: 'કરાર અને દસ્તાવેજો' },
  biReports: { en: 'Business Intelligence', hi: 'व्यापार बुद्धिमत्ता', gu: 'બિઝનેસ ઇન્ટેલિજન્સ' },
  leadsCrm: { en: 'Lead CRM', hi: 'लीड सीआरएम', gu: 'લીડ સીઆરએમ' },
  payroll: { en: 'Staff Payroll', hi: 'वेतन पत्रक', gu: 'કર્મચારી પેરોલ' },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('urbannest_lang') as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('urbannest_lang', lang);
  };

  const t = (key: string, fallback?: string): string => {
    const entry = DICTIONARY[key];
    if (!entry) return fallback || key;
    return entry[language] || entry.en || fallback || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => useContext(I18nContext);

export const LanguageSelector: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage } = useTranslation();

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value as Language)}
      className={`text-xs font-semibold rounded-md border border-[#DDE2DD] bg-white px-2 py-1 text-slate-700 shadow-xs focus:outline-hidden focus:ring-1 focus:ring-[#0B4036] cursor-pointer ${className}`}
      title="Select Language / भाषा चुनें / ભાષા પસંદ કરો"
    >
      <option value="en">English (EN)</option>
      <option value="hi">हिन्दी (HI)</option>
      <option value="gu">ગુજરાતી (GU)</option>
    </select>
  );
};
