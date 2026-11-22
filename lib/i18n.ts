export type Locale = 'fr' | 'ar';

export interface Translations {
  dir: 'ltr' | 'rtl';
  langName: string;
  counterTitle: string;
  counterSub: string;
  offerSentence: (stamps: number, reward: string) => string;
  firstNameLabel: string;
  firstNamePlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  joinAndWalletBtn: string;
  joinAndOpenCardBtn: string;
  optInLabel: string;
  submitting: string;
  welcomeBack: string;
  recognizeText: string;
  openExistingCard: string;
  verifyPhoneTitle: string;
  verifyPhoneDesc: string;
  enterOtpPlaceholder: string;
  verifyBtn: string;
  resendOtp: string;
  invalidOtp: string;
  stampsCount: (stamps: number, total: number) => string;
  rewardsAvailable: (count: number) => string;
  showToCashier: string;
  flipToStamps: string;
  flipToQr: string;
  addToAppleWallet: string;
  saveToGoogleWallet: string;
  addToHomeScreen: string;
  refreshBalance: string;
  stampsRemaining: (rem: number) => string;
  rewardUnlocked: string;
  poweredBy: string;
}

export const translations: Record<Locale, Translations> = {
  fr: {
    dir: 'ltr',
    langName: 'Français',
    counterTitle: 'Programme de Fidélité',
    counterSub: 'Scannez, cumulez vos cafés et savourez vos récompenses.',
    offerSentence: (stamps, reward) => `Achetez ${stamps} cafés et obtenez ${reward.toLowerCase()} offert !`,
    firstNameLabel: 'Votre prénom',
    firstNamePlaceholder: 'Ex. Youssef',
    phoneLabel: 'Numéro de téléphone mobile',
    phonePlaceholder: '06 12 34 56 78',
    joinAndWalletBtn: 'Rejoindre & ajouter au Wallet',
    joinAndOpenCardBtn: 'Rejoindre & ouvrir ma carte',
    optInLabel: "J'accepte de recevoir des offres exclusives par SMS (facultatif)",
    submitting: 'Création de votre carte...',
    welcomeBack: 'Bon retour parmi nous !',
    recognizeText: 'Vous avez déjà une carte de fidélité active pour ce café.',
    openExistingCard: 'Ouvrir ma carte de fidélité',
    verifyPhoneTitle: 'Vérification de sécurité',
    verifyPhoneDesc: 'Ce numéro a déjà une carte active. Entrez le code à 6 chiffres pour ouvrir votre carte sur cet appareil.',
    enterOtpPlaceholder: 'Code à 6 chiffres (ex. 123456)',
    verifyBtn: 'Vérifier et ouvrir',
    resendOtp: 'Renvoyer le code',
    invalidOtp: 'Code incorrect ou expiré. Veuillez réessayer.',
    stampsCount: (stamps, total) => `${stamps} sur ${total} cafés cumulés`,
    rewardsAvailable: (count) => `${count} café(s) offert(s) disponible(s) !`,
    showToCashier: 'Présentez ce QR au serveur lors du paiement pour enregistrer votre visite.',
    flipToStamps: 'Voir mes tampons',
    flipToQr: 'Afficher le QR code',
    addToAppleWallet: 'Ajouter à Apple Wallet',
    saveToGoogleWallet: 'Enregistrer dans Google Wallet',
    addToHomeScreen: "Ajouter à l'écran d'accueil",
    refreshBalance: 'Actualiser mon solde',
    stampsRemaining: (rem) => `Plus que ${rem} café${rem > 1 ? 's' : ''} avant le prochain offert !`,
    rewardUnlocked: '🎉 Récompense débloquée ! À réclamer au comptoir.',
    poweredBy: 'Propulsé par Perkly • Nador, Maroc'
  },
  ar: {
    dir: 'rtl',
    langName: 'العربية',
    counterTitle: 'برنامج الوفاء والمكافآت',
    counterSub: 'اجمع طوابع القهوة واستمتع بمكافآتك المفضلة عند كل زيارة.',
    offerSentence: (stamps, reward) => `اشتري ${stamps} قهوات واحصل على ${reward} مجاناً!`,
    firstNameLabel: 'الاسم الأول',
    firstNamePlaceholder: 'مثال: يوسف أو أمينة',
    phoneLabel: 'رقم الهاتف المحمول',
    phonePlaceholder: '06 12 34 56 78',
    joinAndWalletBtn: 'انضم وأضف إلى المحفظة',
    joinAndOpenCardBtn: 'انضم وافتح بطاقتي',
    optInLabel: 'أوافق على استلام عروض وتخفيضات حصرية عبر الرسائل القصيرة (اختياري)',
    submitting: 'جاري تجهيز بطاقتك...',
    welcomeBack: 'مرحباً بك مجدداً!',
    recognizeText: 'لديك بالفعل بطاقة وفاء نشطة في هذا المقهى.',
    openExistingCard: 'فتح بطاقة الوفاء الخاصة بي',
    verifyPhoneTitle: 'تأكيد رقم الهاتف',
    verifyPhoneDesc: 'هذا الرقم مسجل مسبقاً. أدخل الرمز المكون من 6 أرقام لتسجيل الدخول بأمان على هذا الجهاز.',
    enterOtpPlaceholder: 'رمز التحقق (مثال: 123456)',
    verifyBtn: 'تأكيد وفتح البطاقة',
    resendOtp: 'إعادة إرسال الرمز',
    invalidOtp: 'الرمز غير صحيح أو انتهت صلاحيته. يرجى المحاولة مرة أخرى.',
    stampsCount: (stamps, total) => `${stamps} من ${total} قهوات مجمعة`,
    rewardsAvailable: (count) => `لديك ${count} قهوة مجانية جاهزة للاستلام!`,
    showToCashier: 'أظهر هذا الرمز للنادل عند الدفع لتسجيل زيارتك وجمع الطوابع.',
    flipToStamps: 'عرض الطوابع',
    flipToQr: 'إظهار رمز QR',
    addToAppleWallet: 'إضافة إلى Apple Wallet',
    saveToGoogleWallet: 'حفظ في Google Wallet',
    addToHomeScreen: 'إضافة إلى الشاشة الرئيسية',
    refreshBalance: 'تحديث الرصيد',
    stampsRemaining: (rem) => `تبقى ${rem} قهوة فقط للحصول على قهوتك المجانية!`,
    rewardUnlocked: '🎉 مبروك! لديك قهوة مجانية يمكنك طلبها الآن من النادل.',
    poweredBy: 'مدعوم من Perkly • الناظور، المغرب'
  }
};
