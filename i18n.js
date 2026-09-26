// UI language is independent of the website rules and parent password.
// English source text is retained so a language change can redraw live feedback.
(() => {
  const languages = {
    en: 'English', hi: 'हिन्दी', es: 'Español', fr: 'Français', pt: 'Português',
    ar: 'العربية', bn: 'বাংলা', ru: 'Русский', zh: '简体中文', id: 'Bahasa Indonesia'
  };
  const translations = {};
  const coreKeys = [
    'Language', 'Website access', 'Manage which websites can open in this browser.',
    'Create a parent password', 'The password is required to view or change website rules.',
    'New password', 'Confirm password', 'Create password', 'Unlock website settings',
    'Parent password', 'Show password', 'Unlock settings', 'What should this list do?',
    'Lock now', 'Website rule', 'Allow only websites on this list', 'Block websites on this list',
    'Change rule', 'Allowed websites', 'Blocked websites', 'Saved websites', 'Find a website',
    'Remove selected website', 'Undo last change', 'Check a website', 'Website address',
    'Check website', 'Change parent password', 'Current password', 'Change password',
    'This site is blocked', 'Website', 'This site is blocked by your website settings.',
    'Open parent settings', 'A parent password is required to change website rules.',
    'No websites listed', 'No matches', 'Block part of an allowed website',
    'Content from other websites', 'Allow content from other websites on allowed pages',
    'Save change', 'How to keep settings protected', 'CURRENT WEBSITE',
    'Website to allow', 'Website to block', 'Allow website', 'Block website',
    'Blocked parts', 'Block address', 'Settings are locked. Enter your parent password to continue.',
    'Passwords do not match.', 'Incorrect password.', 'Allowed by {site}.',
    'Blocked by {site}.', 'Parent access · locks in {n} min', '{n} websites',
    '{n} results', 'Reload any open website tabs to see the change.', 'Not saved:',
    'Mode not changed:'
  ];
  const core = {
    hi: [
      'भाषा','वेबसाइट की पहुँच','इस ब्राउज़र में कौन-सी वेबसाइट खुल सकती हैं, यह तय करें।',
      'अभिभावक पासवर्ड बनाएँ','वेबसाइट के नियम देखने या बदलने के लिए पासवर्ड आवश्यक है।',
      'नया पासवर्ड','पासवर्ड की पुष्टि करें','पासवर्ड बनाएँ','वेबसाइट सेटिंग खोलें',
      'अभिभावक पासवर्ड','पासवर्ड दिखाएँ','सेटिंग खोलें','यह सूची क्या करे?',
      'अभी लॉक करें','वेबसाइट नियम','केवल इस सूची की वेबसाइटें खोलें','इस सूची की वेबसाइटें ब्लॉक करें',
      'नियम बदलें','अनुमत वेबसाइटें','ब्लॉक की गई वेबसाइटें','सहेजी गई वेबसाइटें','वेबसाइट खोजें',
      'चुनी हुई वेबसाइट हटाएँ','पिछला बदलाव वापस करें','वेबसाइट जाँचें','वेबसाइट का पता',
      'वेबसाइट जाँचें','अभिभावक पासवर्ड बदलें','वर्तमान पासवर्ड','पासवर्ड बदलें',
      'यह वेबसाइट ब्लॉक है','वेबसाइट','आपकी वेबसाइट सेटिंग के कारण यह वेबसाइट ब्लॉक है।',
      'अभिभावक सेटिंग खोलें','वेबसाइट नियम बदलने के लिए अभिभावक पासवर्ड आवश्यक है।',
      'कोई वेबसाइट सूची में नहीं है','कोई मेल नहीं मिला','अनुमत वेबसाइट का कोई हिस्सा ब्लॉक करें',
      'अन्य वेबसाइटों की सामग्री','अनुमत पेजों पर अन्य वेबसाइटों की सामग्री आने दें',
      'बदलाव सहेजें','सेटिंग सुरक्षित कैसे रखें','वर्तमान वेबसाइट',
      'अनुमति देने के लिए वेबसाइट','ब्लॉक करने के लिए वेबसाइट','वेबसाइट की अनुमति दें','वेबसाइट ब्लॉक करें',
      'ब्लॉक किए गए हिस्से','पता ब्लॉक करें','सेटिंग लॉक हैं। जारी रखने के लिए अभिभावक पासवर्ड डालें।',
      'पासवर्ड मेल नहीं खाते।','गलत पासवर्ड।','{site} के कारण अनुमति है।',
      '{site} के कारण ब्लॉक है।','अभिभावक पहुँच · {n} मिनट में लॉक होगी','{n} वेबसाइटें',
      '{n} परिणाम','बदलाव देखने के लिए खुले वेबसाइट टैब फिर लोड करें।','सहेजा नहीं गया:','नियम नहीं बदला:'
    ],
    es: [
      'Idioma','Acceso a sitios web','Decide qué sitios web se pueden abrir en este navegador.',
      'Crear una contraseña parental','La contraseña es necesaria para ver o cambiar las reglas de sitios web.',
      'Nueva contraseña','Confirmar contraseña','Crear contraseña','Desbloquear la configuración de sitios web',
      'Contraseña parental','Mostrar contraseña','Desbloquear configuración','¿Qué debe hacer esta lista?',
      'Bloquear ahora','Regla de sitios web','Permitir solo los sitios de esta lista','Bloquear los sitios de esta lista',
      'Cambiar regla','Sitios permitidos','Sitios bloqueados','Sitios guardados','Buscar un sitio',
      'Quitar el sitio seleccionado','Deshacer el último cambio','Comprobar un sitio','Dirección del sitio',
      'Comprobar sitio','Cambiar contraseña parental','Contraseña actual','Cambiar contraseña',
      'Este sitio está bloqueado','Sitio web','Este sitio está bloqueado por tu configuración.',
      'Abrir configuración parental','Se necesita la contraseña parental para cambiar las reglas.',
      'No hay sitios en la lista','Sin resultados','Bloquear parte de un sitio permitido',
      'Contenido de otros sitios','Permitir contenido de otros sitios en páginas permitidas',
      'Guardar cambio','Cómo proteger la configuración','SITIO ACTUAL',
      'Sitio para permitir','Sitio para bloquear','Permitir sitio','Bloquear sitio',
      'Partes bloqueadas','Bloquear dirección','La configuración está bloqueada. Escribe la contraseña parental para continuar.',
      'Las contraseñas no coinciden.','Contraseña incorrecta.','Permitido por {site}.',
      'Bloqueado por {site}.','Acceso parental · se bloquea en {n} min','{n} sitios',
      '{n} resultados','Recarga las pestañas abiertas para ver el cambio.','No se guardó:','No se cambió la regla:'
    ],
    fr: [
      'Langue','Accès aux sites web','Choisissez les sites web qui peuvent s’ouvrir dans ce navigateur.',
      'Créer un mot de passe parental','Le mot de passe est requis pour voir ou modifier les règles des sites web.',
      'Nouveau mot de passe','Confirmer le mot de passe','Créer le mot de passe','Déverrouiller les paramètres des sites web',
      'Mot de passe parental','Afficher le mot de passe','Déverrouiller les paramètres','Que doit faire cette liste ?',
      'Verrouiller maintenant','Règle des sites web','Autoriser uniquement les sites de cette liste','Bloquer les sites de cette liste',
      'Changer la règle','Sites autorisés','Sites bloqués','Sites enregistrés','Rechercher un site',
      'Supprimer le site sélectionné','Annuler la dernière modification','Vérifier un site','Adresse du site',
      'Vérifier le site','Modifier le mot de passe parental','Mot de passe actuel','Modifier le mot de passe',
      'Ce site est bloqué','Site web','Ce site est bloqué par vos paramètres.',
      'Ouvrir les paramètres parentaux','Le mot de passe parental est requis pour modifier les règles.',
      'Aucun site dans la liste','Aucun résultat','Bloquer une partie d’un site autorisé',
      'Contenu d’autres sites','Autoriser le contenu d’autres sites sur les pages autorisées',
      'Enregistrer la modification','Comment protéger les paramètres','SITE ACTUEL',
      'Site à autoriser','Site à bloquer','Autoriser le site','Bloquer le site',
      'Parties bloquées','Bloquer l’adresse','Les paramètres sont verrouillés. Saisissez le mot de passe parental pour continuer.',
      'Les mots de passe ne correspondent pas.','Mot de passe incorrect.','Autorisé par {site}.',
      'Bloqué par {site}.','Accès parental · verrouillage dans {n} min','{n} sites',
      '{n} résultats','Rechargez les onglets ouverts pour voir la modification.','Non enregistré :','Règle non modifiée :'
    ],
    pt: [
      'Idioma','Acesso a sites','Escolha quais sites podem abrir neste navegador.',
      'Criar senha dos pais','A senha é necessária para ver ou alterar as regras dos sites.',
      'Nova senha','Confirmar senha','Criar senha','Desbloquear configurações de sites',
      'Senha dos pais','Mostrar senha','Desbloquear configurações','O que esta lista deve fazer?',
      'Bloquear agora','Regra de sites','Permitir apenas os sites desta lista','Bloquear os sites desta lista',
      'Alterar regra','Sites permitidos','Sites bloqueados','Sites salvos','Encontrar um site',
      'Remover site selecionado','Desfazer última alteração','Verificar um site','Endereço do site',
      'Verificar site','Alterar senha dos pais','Senha atual','Alterar senha',
      'Este site está bloqueado','Site','Este site está bloqueado pelas suas configurações.',
      'Abrir configurações dos pais','A senha dos pais é necessária para alterar as regras.',
      'Nenhum site na lista','Nenhum resultado','Bloquear parte de um site permitido',
      'Conteúdo de outros sites','Permitir conteúdo de outros sites em páginas permitidas',
      'Salvar alteração','Como proteger as configurações','SITE ATUAL',
      'Site para permitir','Site para bloquear','Permitir site','Bloquear site',
      'Partes bloqueadas','Bloquear endereço','As configurações estão bloqueadas. Digite a senha dos pais para continuar.',
      'As senhas não coincidem.','Senha incorreta.','Permitido por {site}.',
      'Bloqueado por {site}.','Acesso dos pais · bloqueia em {n} min','{n} sites',
      '{n} resultados','Recarregue as abas abertas para ver a alteração.','Não foi salvo:','Regra não alterada:'
    ],
    ar: [
      'اللغة','الوصول إلى المواقع','اختر المواقع التي يمكن فتحها في هذا المتصفح.',
      'إنشاء كلمة مرور للوالد','يلزم إدخال كلمة المرور لعرض قواعد المواقع أو تغييرها.',
      'كلمة مرور جديدة','تأكيد كلمة المرور','إنشاء كلمة المرور','فتح إعدادات المواقع',
      'كلمة مرور الوالد','إظهار كلمة المرور','فتح الإعدادات','ماذا يجب أن تفعل هذه القائمة؟',
      'اقفل الآن','قاعدة المواقع','السماح فقط بالمواقع في هذه القائمة','حظر المواقع في هذه القائمة',
      'تغيير القاعدة','المواقع المسموح بها','المواقع المحظورة','المواقع المحفوظة','البحث عن موقع',
      'إزالة الموقع المحدد','التراجع عن آخر تغيير','فحص موقع','عنوان الموقع',
      'فحص الموقع','تغيير كلمة مرور الوالد','كلمة المرور الحالية','تغيير كلمة المرور',
      'هذا الموقع محظور','الموقع','هذا الموقع محظور وفقًا لإعداداتك.',
      'فتح إعدادات الوالد','يلزم إدخال كلمة مرور الوالد لتغيير قواعد المواقع.',
      'لا توجد مواقع في القائمة','لا توجد نتائج','حظر جزء من موقع مسموح به',
      'محتوى من مواقع أخرى','السماح بمحتوى من مواقع أخرى على الصفحات المسموح بها',
      'حفظ التغيير','كيفية حماية الإعدادات','الموقع الحالي',
      'موقع للسماح به','موقع لحظره','السماح بالموقع','حظر الموقع',
      'الأجزاء المحظورة','حظر العنوان','الإعدادات مقفلة. أدخل كلمة مرور الوالد للمتابعة.',
      'كلمتا المرور غير متطابقتين.','كلمة المرور غير صحيحة.','مسموح به بسبب {site}.',
      'محظور بسبب {site}.','وصول الوالد · يُقفل خلال {n} دقيقة','{n} مواقع',
      '{n} نتائج','أعد تحميل علامات التبويب المفتوحة لرؤية التغيير.','لم يُحفظ:','لم تتغير القاعدة:'
    ],
    bn: [
      'ভাষা','ওয়েবসাইট ব্যবহারের অনুমতি','এই ব্রাউজারে কোন ওয়েবসাইট খোলা যাবে তা ঠিক করুন।',
      'অভিভাবকের পাসওয়ার্ড তৈরি করুন','ওয়েবসাইটের নিয়ম দেখতে বা বদলাতে পাসওয়ার্ড প্রয়োজন।',
      'নতুন পাসওয়ার্ড','পাসওয়ার্ড নিশ্চিত করুন','পাসওয়ার্ড তৈরি করুন','ওয়েবসাইট সেটিংস আনলক করুন',
      'অভিভাবকের পাসওয়ার্ড','পাসওয়ার্ড দেখান','সেটিংস আনলক করুন','এই তালিকা কী করবে?',
      'এখনই লক করুন','ওয়েবসাইটের নিয়ম','শুধু এই তালিকার ওয়েবসাইটগুলো খুলতে দিন','এই তালিকার ওয়েবসাইটগুলো ব্লক করুন',
      'নিয়ম বদলান','অনুমোদিত ওয়েবসাইট','ব্লক করা ওয়েবসাইট','সংরক্ষিত ওয়েবসাইট','ওয়েবসাইট খুঁজুন',
      'নির্বাচিত ওয়েবসাইট সরান','শেষ পরিবর্তন ফিরিয়ে আনুন','ওয়েবসাইট যাচাই করুন','ওয়েবসাইটের ঠিকানা',
      'ওয়েবসাইট যাচাই করুন','অভিভাবকের পাসওয়ার্ড বদলান','বর্তমান পাসওয়ার্ড','পাসওয়ার্ড বদলান',
      'এই ওয়েবসাইট ব্লক করা হয়েছে','ওয়েবসাইট','আপনার সেটিংসের কারণে এই ওয়েবসাইট ব্লক করা হয়েছে।',
      'অভিভাবকের সেটিংস খুলুন','ওয়েবসাইটের নিয়ম বদলাতে অভিভাবকের পাসওয়ার্ড প্রয়োজন।',
      'তালিকায় কোনো ওয়েবসাইট নেই','কোনো মিল নেই','অনুমোদিত ওয়েবসাইটের একটি অংশ ব্লক করুন',
      'অন্য ওয়েবসাইটের কনটেন্ট','অনুমোদিত পেজে অন্য ওয়েবসাইটের কনটেন্ট আসতে দিন',
      'পরিবর্তন সংরক্ষণ করুন','সেটিংস সুরক্ষিত রাখার উপায়','বর্তমান ওয়েবসাইট',
      'অনুমতি দেওয়ার ওয়েবসাইট','ব্লক করার ওয়েবসাইট','ওয়েবসাইট অনুমোদন করুন','ওয়েবসাইট ব্লক করুন',
      'ব্লক করা অংশ','ঠিকানা ব্লক করুন','সেটিংস লক করা আছে। চালিয়ে যেতে অভিভাবকের পাসওয়ার্ড দিন।',
      'পাসওয়ার্ড দুটি মেলেনি।','পাসওয়ার্ড ভুল।','{site} দ্বারা অনুমোদিত।',
      '{site} দ্বারা ব্লক করা হয়েছে।','অভিভাবকের প্রবেশাধিকার · {n} মিনিটে লক হবে','{n}টি ওয়েবসাইট',
      '{n}টি ফলাফল','পরিবর্তন দেখতে খোলা ওয়েবসাইট ট্যাব আবার লোড করুন।','সংরক্ষণ হয়নি:','নিয়ম বদলায়নি:'
    ],
    ru: [
      'Язык','Доступ к сайтам','Выберите, какие сайты можно открывать в этом браузере.',
      'Создать родительский пароль','Пароль нужен для просмотра и изменения правил доступа к сайтам.',
      'Новый пароль','Подтвердите пароль','Создать пароль','Разблокировать настройки сайтов',
      'Родительский пароль','Показать пароль','Разблокировать настройки','Что должен делать этот список?',
      'Заблокировать сейчас','Правило для сайтов','Разрешать только сайты из этого списка','Блокировать сайты из этого списка',
      'Изменить правило','Разрешённые сайты','Заблокированные сайты','Сохранённые сайты','Найти сайт',
      'Удалить выбранный сайт','Отменить последнее изменение','Проверить сайт','Адрес сайта',
      'Проверить сайт','Изменить родительский пароль','Текущий пароль','Изменить пароль',
      'Этот сайт заблокирован','Сайт','Этот сайт заблокирован вашими настройками.',
      'Открыть родительские настройки','Для изменения правил нужен родительский пароль.',
      'В списке нет сайтов','Совпадений нет','Заблокировать часть разрешённого сайта',
      'Контент с других сайтов','Разрешать контент с других сайтов на разрешённых страницах',
      'Сохранить изменение','Как защитить настройки','ТЕКУЩИЙ САЙТ',
      'Сайт для разрешения','Сайт для блокировки','Разрешить сайт','Заблокировать сайт',
      'Заблокированные части','Заблокировать адрес','Настройки заблокированы. Введите родительский пароль, чтобы продолжить.',
      'Пароли не совпадают.','Неверный пароль.','Разрешено правилом {site}.',
      'Заблокировано правилом {site}.','Родительский доступ · блокировка через {n} мин','{n} сайтов',
      '{n} результатов','Перезагрузите открытые вкладки, чтобы увидеть изменение.','Не сохранено:','Правило не изменено:'
    ],
    zh: [
      '语言','网站访问','选择此浏览器可以打开哪些网站。',
      '创建家长密码','查看或更改网站规则需要密码。',
      '新密码','确认密码','创建密码','解锁网站设置',
      '家长密码','显示密码','解锁设置','此列表应如何生效？',
      '立即锁定','网站规则','仅允许打开此列表中的网站','阻止此列表中的网站',
      '更改规则','允许的网站','被阻止的网站','已保存的网站','查找网站',
      '移除所选网站','撤销上次更改','检查网站','网站地址',
      '检查网站','更改家长密码','当前密码','更改密码',
      '此网站已被阻止','网站','此网站被您的网站设置阻止。',
      '打开家长设置','更改网站规则需要家长密码。',
      '列表中没有网站','没有匹配结果','阻止已允许网站的部分内容',
      '其他网站的内容','允许已允许页面加载其他网站的内容',
      '保存更改','如何保护设置','当前网站',
      '要允许的网站','要阻止的网站','允许网站','阻止网站',
      '被阻止的部分','阻止地址','设置已锁定。请输入家长密码以继续。',
      '密码不匹配。','密码错误。','由 {site} 允许。',
      '由 {site} 阻止。','家长访问权限 · {n} 分钟后锁定','{n} 个网站',
      '{n} 个结果','重新加载已打开的网站标签页以查看更改。','未保存：','规则未更改：'
    ],
    id: [
      'Bahasa','Akses situs web','Pilih situs web yang dapat dibuka di browser ini.',
      'Buat kata sandi orang tua','Kata sandi diperlukan untuk melihat atau mengubah aturan situs web.',
      'Kata sandi baru','Konfirmasi kata sandi','Buat kata sandi','Buka kunci pengaturan situs web',
      'Kata sandi orang tua','Tampilkan kata sandi','Buka kunci pengaturan','Apa fungsi daftar ini?',
      'Kunci sekarang','Aturan situs web','Izinkan hanya situs dalam daftar ini','Blokir situs dalam daftar ini',
      'Ubah aturan','Situs yang diizinkan','Situs yang diblokir','Situs tersimpan','Cari situs',
      'Hapus situs yang dipilih','Urungkan perubahan terakhir','Periksa situs','Alamat situs',
      'Periksa situs','Ubah kata sandi orang tua','Kata sandi saat ini','Ubah kata sandi',
      'Situs ini diblokir','Situs web','Situs ini diblokir oleh pengaturan Anda.',
      'Buka pengaturan orang tua','Kata sandi orang tua diperlukan untuk mengubah aturan.',
      'Tidak ada situs dalam daftar','Tidak ada hasil','Blokir sebagian situs yang diizinkan',
      'Konten dari situs lain','Izinkan konten dari situs lain pada halaman yang diizinkan',
      'Simpan perubahan','Cara melindungi pengaturan','SITUS SAAT INI',
      'Situs yang akan diizinkan','Situs yang akan diblokir','Izinkan situs','Blokir situs',
      'Bagian yang diblokir','Blokir alamat','Pengaturan terkunci. Masukkan kata sandi orang tua untuk melanjutkan.',
      'Kata sandi tidak cocok.','Kata sandi salah.','Diizinkan oleh {site}.',
      'Diblokir oleh {site}.','Akses orang tua · terkunci dalam {n} mnt','{n} situs',
      '{n} hasil','Muat ulang tab situs yang terbuka untuk melihat perubahan.','Tidak tersimpan:','Aturan tidak diubah:'
    ]
  };
  for (const [code, values] of Object.entries(core)) {
    if (values.length !== coreKeys.length) throw new Error(`Translation count mismatch: ${code}`);
    translations[code] = Object.fromEntries(coreKeys.map((key, index) => [key, values[index]]));
  }
  const extraKeys = [
    'Changing this rule affects other websites. Your allowed and blocked lists are saved separately.',
    'Choose a rule to finish upgrading.',
    'Your older setup used both lists. Choose one rule to continue. Previous entries stay saved for review.',
    'These websites and their subdomains can open. You can block specific subdomains below.',
    'These websites and their subdomains cannot open.',
    'Enter a website name such as youtube.com. This includes its subdomains.',
    'Select a website in the list, then choose Remove selected website. You can undo a removal.',
    'If you allow example.com, you can still block kids.example.com and its subdomains.',
    'Address to block', 'Add its main website to Allowed websites first.', 'No blocked parts yet.',
    'Some sites need content from other sites. Turning this off may break videos, images, or sign-in.',
    'Why might sign-in or payment pages be blocked?',
    'An embedded sign-in or payment page may use another domain. Add that domain to Allowed websites if you trust it. This also permits direct visits.',
    'Check whether a site can open. This does not check embedded content.',
    'Previous allowed entries', 'Old allowed entries stay saved for review. Some may still be blocked.',
    'A password helps protect rules. Someone who can manage extensions can turn BrowseLatch off. Use a child account for stronger protection.',
    'Only websites on this list can open. All others are blocked.',
    'Websites on this list are blocked. All others can open.',
    'Blocked because it is not on your allowed websites list.',
    'Allowed because it is not on your blocked websites list.',
    'This site is not on your allowed websites list.', 'This site is on your blocked websites list.',
    'This part of an allowed website is blocked.',
    'Settings locked after five minutes. Enter your parent password to continue.',
    'Settings are locked. Enter the parent password.',
    'Could not confirm access. Enter your parent password to continue.',
    'Extra content is allowed', 'Extra content from other websites is blocked',
    'Select Save change to apply this setting.', 'Password changed.', 'Last change undone.',
    'Website rule changed.', 'Could not reach the extension.', 'Enter a valid website address or domain.',
    'Blocked because {site} is a blocked subdomain.', 'Allow {site} and its subdomains.',
    'Block {site} and its subdomains.', '{site} added to allowed websites.',
    '{site} added to blocked websites.', '{site} removed.', '{site} is already listed.',
    '{site} is already blocked.', '{site} is now blocked.', '{site} is no longer blocked.',
    'Remove {site} from allowed websites', 'Remove {site} from blocked websites',
    'Try again in {n} seconds.', '{a} previously allowed · {b} previously blocked'
  ];
  const extra = {
    es: [
      'Cambiar esta regla afecta a otros sitios. Las listas de permitidos y bloqueados se guardan por separado.',
      'Elige una regla para terminar la actualización.',
      'La configuración anterior usaba ambas listas. Elige una regla para continuar. Las entradas anteriores se conservan para revisarlas.',
      'Estos sitios y sus subdominios pueden abrirse. Puedes bloquear subdominios específicos abajo.',
      'Estos sitios y sus subdominios no pueden abrirse.',
      'Escribe un sitio como youtube.com. También se incluyen sus subdominios.',
      'Selecciona un sitio en la lista y elige Quitar el sitio seleccionado. Puedes deshacerlo.',
      'Si permites example.com, también puedes bloquear kids.example.com y sus subdominios.',
      'Dirección para bloquear','Primero añade su sitio principal a Sitios permitidos.','Aún no hay partes bloqueadas.',
      'Algunos sitios necesitan contenido de otros. Desactivarlo puede afectar videos, imágenes o el inicio de sesión.',
      '¿Por qué se bloquean páginas de inicio de sesión o pago?',
      'Una página integrada de inicio de sesión o pago puede usar otro dominio. Añádelo a Sitios permitidos si confías en él. Esto también permite visitarlo directamente.',
      'Comprueba si un sitio puede abrirse. No se comprueba el contenido integrado.',
      'Entradas permitidas anteriores','Las entradas anteriores se conservan para revisarlas. Algunas pueden seguir bloqueadas.',
      'La contraseña ayuda a proteger las reglas. Quien pueda administrar extensiones puede desactivar BrowseLatch. Usa una cuenta infantil para mayor protección.',
      'Solo se pueden abrir los sitios de esta lista. Todos los demás están bloqueados.',
      'Los sitios de esta lista están bloqueados. Todos los demás pueden abrirse.',
      'Bloqueado porque no está en tu lista de sitios permitidos.',
      'Permitido porque no está en tu lista de sitios bloqueados.',
      'Este sitio no está en tu lista de sitios permitidos.','Este sitio está en tu lista de sitios bloqueados.',
      'Esta parte de un sitio permitido está bloqueada.',
      'La configuración se bloqueó tras cinco minutos. Escribe la contraseña parental para continuar.',
      'La configuración está bloqueada. Escribe la contraseña parental.',
      'No se pudo confirmar el acceso. Escribe la contraseña parental para continuar.',
      'Se permite el contenido adicional','Se bloquea el contenido adicional de otros sitios',
      'Selecciona Guardar cambio para aplicar esta opción.','Contraseña cambiada.','Se deshizo el último cambio.',
      'Se cambió la regla de sitios.','No se pudo conectar con la extensión.','Escribe una dirección o dominio válido.',
      'Bloqueado porque {site} es un subdominio bloqueado.','Permitir {site} y sus subdominios.',
      'Bloquear {site} y sus subdominios.','{site} se añadió a los sitios permitidos.',
      '{site} se añadió a los sitios bloqueados.','Se quitó {site}.','{site} ya está en la lista.',
      '{site} ya está bloqueado.','{site} está bloqueado.','{site} ya no está bloqueado.',
      'Quitar {site} de los sitios permitidos','Quitar {site} de los sitios bloqueados',
      'Inténtalo de nuevo en {n} segundos.','{a} permitidos antes · {b} bloqueados antes'
    ],
    fr: [
      'Changer cette règle affecte les autres sites. Les listes autorisées et bloquées sont enregistrées séparément.',
      'Choisissez une règle pour terminer la mise à niveau.',
      'L’ancien réglage utilisait les deux listes. Choisissez une règle pour continuer. Les anciennes entrées restent enregistrées pour examen.',
      'Ces sites et leurs sous-domaines peuvent s’ouvrir. Vous pouvez bloquer certains sous-domaines ci-dessous.',
      'Ces sites et leurs sous-domaines ne peuvent pas s’ouvrir.',
      'Saisissez un site comme youtube.com. Ses sous-domaines sont aussi inclus.',
      'Sélectionnez un site dans la liste, puis choisissez Supprimer le site sélectionné. Vous pouvez annuler la suppression.',
      'Si vous autorisez example.com, vous pouvez quand même bloquer kids.example.com et ses sous-domaines.',
      'Adresse à bloquer','Ajoutez d’abord son site principal aux Sites autorisés.','Aucune partie bloquée pour le moment.',
      'Certains sites ont besoin de contenu venant d’autres sites. Désactiver cette option peut perturber les vidéos, les images ou la connexion.',
      'Pourquoi les pages de connexion ou de paiement sont-elles bloquées ?',
      'Une page de connexion ou de paiement intégrée peut utiliser un autre domaine. Ajoutez-le aux Sites autorisés si vous lui faites confiance. Cela permet aussi de le visiter directement.',
      'Vérifiez si un site peut s’ouvrir. Le contenu intégré n’est pas vérifié.',
      'Anciennes entrées autorisées','Les anciennes entrées restent enregistrées pour examen. Certaines peuvent encore être bloquées.',
      'Le mot de passe aide à protéger les règles. Une personne pouvant gérer les extensions peut désactiver BrowseLatch. Utilisez un compte enfant pour mieux protéger le navigateur.',
      'Seuls les sites de cette liste peuvent s’ouvrir. Tous les autres sont bloqués.',
      'Les sites de cette liste sont bloqués. Tous les autres peuvent s’ouvrir.',
      'Bloqué car ce site ne figure pas dans votre liste de sites autorisés.',
      'Autorisé car ce site ne figure pas dans votre liste de sites bloqués.',
      'Ce site ne figure pas dans votre liste de sites autorisés.','Ce site figure dans votre liste de sites bloqués.',
      'Cette partie d’un site autorisé est bloquée.',
      'Les paramètres ont été verrouillés après cinq minutes. Saisissez le mot de passe parental pour continuer.',
      'Les paramètres sont verrouillés. Saisissez le mot de passe parental.',
      'Impossible de confirmer l’accès. Saisissez le mot de passe parental pour continuer.',
      'Le contenu supplémentaire est autorisé','Le contenu supplémentaire d’autres sites est bloqué',
      'Sélectionnez Enregistrer la modification pour appliquer ce réglage.','Mot de passe modifié.','Dernière modification annulée.',
      'Règle des sites modifiée.','Impossible de joindre l’extension.','Saisissez une adresse ou un domaine valide.',
      'Bloqué car {site} est un sous-domaine bloqué.','Autoriser {site} et ses sous-domaines.',
      'Bloquer {site} et ses sous-domaines.','{site} ajouté aux sites autorisés.',
      '{site} ajouté aux sites bloqués.','{site} supprimé.','{site} figure déjà dans la liste.',
      '{site} est déjà bloqué.','{site} est maintenant bloqué.','{site} n’est plus bloqué.',
      'Supprimer {site} des sites autorisés','Supprimer {site} des sites bloqués',
      'Réessayez dans {n} secondes.','{a} anciennement autorisés · {b} anciennement bloqués'
    ],
    pt: [
      'Alterar esta regra afeta outros sites. As listas de permitidos e bloqueados são salvas separadamente.',
      'Escolha uma regra para concluir a atualização.',
      'A configuração antiga usava as duas listas. Escolha uma regra para continuar. As entradas antigas permanecem salvas para análise.',
      'Estes sites e seus subdomínios podem abrir. Você pode bloquear subdomínios específicos abaixo.',
      'Estes sites e seus subdomínios não podem abrir.',
      'Digite um site como youtube.com. Seus subdomínios também são incluídos.',
      'Selecione um site na lista e escolha Remover site selecionado. Você pode desfazer a remoção.',
      'Se você permitir example.com, ainda poderá bloquear kids.example.com e seus subdomínios.',
      'Endereço para bloquear','Adicione primeiro o site principal a Sites permitidos.','Ainda não há partes bloqueadas.',
      'Alguns sites precisam de conteúdo de outros sites. Desativar isto pode afetar vídeos, imagens ou login.',
      'Por que páginas de login ou pagamento podem ser bloqueadas?',
      'Uma página incorporada de login ou pagamento pode usar outro domínio. Adicione-o a Sites permitidos se confiar nele. Isso também permite visitá-lo diretamente.',
      'Verifique se um site pode abrir. O conteúdo incorporado não é verificado.',
      'Entradas permitidas anteriores','As entradas antigas permanecem salvas para análise. Algumas ainda podem estar bloqueadas.',
      'A senha ajuda a proteger as regras. Quem puder gerenciar extensões pode desativar o BrowseLatch. Use uma conta infantil para maior proteção.',
      'Somente os sites desta lista podem abrir. Todos os outros estão bloqueados.',
      'Os sites desta lista estão bloqueados. Todos os outros podem abrir.',
      'Bloqueado porque não está na lista de sites permitidos.',
      'Permitido porque não está na lista de sites bloqueados.',
      'Este site não está na lista de sites permitidos.','Este site está na lista de sites bloqueados.',
      'Esta parte de um site permitido está bloqueada.',
      'As configurações foram bloqueadas após cinco minutos. Digite a senha dos pais para continuar.',
      'As configurações estão bloqueadas. Digite a senha dos pais.',
      'Não foi possível confirmar o acesso. Digite a senha dos pais para continuar.',
      'Conteúdo extra permitido','Conteúdo extra de outros sites bloqueado',
      'Selecione Salvar alteração para aplicar esta configuração.','Senha alterada.','Última alteração desfeita.',
      'Regra de sites alterada.','Não foi possível acessar a extensão.','Digite um endereço ou domínio válido.',
      'Bloqueado porque {site} é um subdomínio bloqueado.','Permitir {site} e seus subdomínios.',
      'Bloquear {site} e seus subdomínios.','{site} adicionado aos sites permitidos.',
      '{site} adicionado aos sites bloqueados.','{site} removido.','{site} já está na lista.',
      '{site} já está bloqueado.','{site} agora está bloqueado.','{site} não está mais bloqueado.',
      'Remover {site} dos sites permitidos','Remover {site} dos sites bloqueados',
      'Tente novamente em {n} segundos.','{a} permitidos antes · {b} bloqueados antes'
    ],
    hi: [
      'यह नियम बदलने से अन्य वेबसाइटों पर असर पड़ता है। अनुमत और ब्लॉक सूची अलग-अलग सहेजी जाती हैं।',
      'अपग्रेड पूरा करने के लिए एक नियम चुनें।',
      'पुराने सेटअप में दोनों सूचियाँ थीं। आगे बढ़ने के लिए एक नियम चुनें। पुरानी प्रविष्टियाँ समीक्षा के लिए सहेजी रहेंगी।',
      'ये वेबसाइटें और इनके उपडोमेन खुल सकते हैं। नीचे किसी खास उपडोमेन को ब्लॉक कर सकते हैं।',
      'ये वेबसाइटें और इनके उपडोमेन नहीं खुल सकते।',
      'youtube.com जैसा वेबसाइट नाम डालें। इसके उपडोमेन भी शामिल होंगे।',
      'सूची में वेबसाइट चुनें और चुनी हुई वेबसाइट हटाएँ दबाएँ। हटाना वापस किया जा सकता है।',
      'example.com को अनुमति देने पर भी kids.example.com और उसके उपडोमेन ब्लॉक कर सकते हैं।',
      'ब्लॉक करने का पता','पहले मुख्य वेबसाइट को अनुमत वेबसाइटों में जोड़ें।','अभी कोई हिस्सा ब्लॉक नहीं है।',
      'कुछ वेबसाइटों को अन्य वेबसाइटों की सामग्री चाहिए। इसे बंद करने से वीडियो, चित्र या साइन-इन रुक सकता है।',
      'साइन-इन या भुगतान पेज क्यों ब्लॉक हो सकते हैं?',
      'जुड़ा हुआ साइन-इन या भुगतान पेज दूसरे डोमेन का उपयोग कर सकता है। भरोसा हो तो उसे अनुमत वेबसाइटों में जोड़ें। तब उसे सीधे भी खोला जा सकेगा।',
      'जाँचें कि वेबसाइट खुल सकती है या नहीं। इससे उसमें जुड़ी सामग्री की जाँच नहीं होती।',
      'पहले की अनुमत प्रविष्टियाँ','पुरानी अनुमत प्रविष्टियाँ समीक्षा के लिए सहेजी हैं। कुछ अब भी ब्लॉक हो सकती हैं।',
      'पासवर्ड नियमों को सुरक्षित रखने में मदद करता है। एक्सटेंशन प्रबंधित कर सकने वाला व्यक्ति BrowseLatch बंद कर सकता है। अधिक सुरक्षा के लिए बच्चे का खाता उपयोग करें।',
      'केवल इस सूची की वेबसाइटें खुल सकती हैं। बाकी सभी ब्लॉक हैं।',
      'इस सूची की वेबसाइटें ब्लॉक हैं। बाकी सभी खुल सकती हैं।',
      'ब्लॉक है क्योंकि यह अनुमत वेबसाइटों की सूची में नहीं है।',
      'अनुमति है क्योंकि यह ब्लॉक वेबसाइटों की सूची में नहीं है।',
      'यह वेबसाइट अनुमत सूची में नहीं है।','यह वेबसाइट ब्लॉक सूची में है।',
      'अनुमत वेबसाइट का यह हिस्सा ब्लॉक है।',
      'पाँच मिनट बाद सेटिंग लॉक हो गईं। जारी रखने के लिए अभिभावक पासवर्ड डालें।',
      'सेटिंग लॉक हैं। अभिभावक पासवर्ड डालें।',
      'पहुँच की पुष्टि नहीं हो सकी। जारी रखने के लिए अभिभावक पासवर्ड डालें।',
      'अतिरिक्त सामग्री की अनुमति है','अन्य वेबसाइटों की अतिरिक्त सामग्री ब्लॉक है',
      'यह सेटिंग लागू करने के लिए बदलाव सहेजें दबाएँ।','पासवर्ड बदल दिया गया।','पिछला बदलाव वापस कर दिया गया।',
      'वेबसाइट नियम बदल दिया गया।','एक्सटेंशन से संपर्क नहीं हो सका।','मान्य वेबसाइट पता या डोमेन डालें।',
      'ब्लॉक है क्योंकि {site} ब्लॉक किया गया उपडोमेन है।','{site} और उसके उपडोमेन को अनुमति दें।',
      '{site} और उसके उपडोमेन को ब्लॉक करें।','{site} अनुमत वेबसाइटों में जोड़ा गया।',
      '{site} ब्लॉक वेबसाइटों में जोड़ा गया।','{site} हटा दिया गया।','{site} पहले से सूची में है।',
      '{site} पहले से ब्लॉक है।','{site} अब ब्लॉक है।','{site} अब ब्लॉक नहीं है।',
      '{site} को अनुमत वेबसाइटों से हटाएँ','{site} को ब्लॉक वेबसाइटों से हटाएँ',
      '{n} सेकंड बाद फिर कोशिश करें।','पहले {a} अनुमत · पहले {b} ब्लॉक'
    ],
    ar: [
      'يؤثر تغيير هذه القاعدة في المواقع الأخرى. تُحفظ قائمتا السماح والحظر كل على حدة.',
      'اختر قاعدة لإنهاء التحديث.',
      'استخدم الإعداد القديم القائمتين. اختر قاعدة للمتابعة. تبقى الإدخالات القديمة محفوظة للمراجعة.',
      'يمكن فتح هذه المواقع ونطاقاتها الفرعية. ويمكنك حظر نطاقات فرعية محددة أدناه.',
      'لا يمكن فتح هذه المواقع ونطاقاتها الفرعية.',
      'أدخل اسم موقع مثل youtube.com. ويشمل ذلك نطاقاته الفرعية.',
      'حدد موقعًا في القائمة ثم اختر إزالة الموقع المحدد. يمكنك التراجع عن الإزالة.',
      'إذا سمحت بموقع example.com، فلا يزال بإمكانك حظر kids.example.com ونطاقاته الفرعية.',
      'العنوان المراد حظره','أضف موقعه الرئيسي إلى المواقع المسموح بها أولًا.','لا توجد أجزاء محظورة بعد.',
      'تحتاج بعض المواقع إلى محتوى من مواقع أخرى. قد يؤدي إيقاف هذا الخيار إلى تعطيل الفيديو أو الصور أو تسجيل الدخول.',
      'لماذا قد تُحظر صفحات تسجيل الدخول أو الدفع؟',
      'قد تستخدم صفحة تسجيل دخول أو دفع مضمنة نطاقًا آخر. أضف هذا النطاق إلى المواقع المسموح بها إذا كنت تثق به. ويسمح ذلك بزيارته مباشرة أيضًا.',
      'تحقق مما إذا كان الموقع يمكن فتحه. لا يشمل الفحص المحتوى المضمن.',
      'إدخالات السماح السابقة','تبقى إدخالات السماح القديمة محفوظة للمراجعة. قد يكون بعضها محظورًا.',
      'تساعد كلمة المرور في حماية القواعد. يمكن لمن يدير الإضافات إيقاف BrowseLatch. استخدم حساب طفل لحماية أقوى.',
      'يمكن فتح المواقع الموجودة في هذه القائمة فقط. جميع المواقع الأخرى محظورة.',
      'المواقع الموجودة في هذه القائمة محظورة. يمكن فتح جميع المواقع الأخرى.',
      'محظور لأنه غير موجود في قائمة المواقع المسموح بها.',
      'مسموح به لأنه غير موجود في قائمة المواقع المحظورة.',
      'هذا الموقع غير موجود في قائمة المواقع المسموح بها.','هذا الموقع موجود في قائمة المواقع المحظورة.',
      'هذا الجزء من موقع مسموح به محظور.',
      'أُقفلت الإعدادات بعد خمس دقائق. أدخل كلمة مرور الوالد للمتابعة.',
      'الإعدادات مقفلة. أدخل كلمة مرور الوالد.',
      'تعذر تأكيد الوصول. أدخل كلمة مرور الوالد للمتابعة.',
      'المحتوى الإضافي مسموح به','المحتوى الإضافي من مواقع أخرى محظور',
      'اختر حفظ التغيير لتطبيق هذا الإعداد.','تم تغيير كلمة المرور.','تم التراجع عن آخر تغيير.',
      'تم تغيير قاعدة المواقع.','تعذر الاتصال بالإضافة.','أدخل عنوان موقع أو نطاقًا صالحًا.',
      'محظور لأن {site} نطاق فرعي محظور.','السماح بـ {site} ونطاقاته الفرعية.',
      'حظر {site} ونطاقاته الفرعية.','أُضيف {site} إلى المواقع المسموح بها.',
      'أُضيف {site} إلى المواقع المحظورة.','أُزيل {site}.','{site} موجود في القائمة بالفعل.',
      '{site} محظور بالفعل.','أصبح {site} محظورًا.','لم يعد {site} محظورًا.',
      'إزالة {site} من المواقع المسموح بها','إزالة {site} من المواقع المحظورة',
      'حاول مجددًا بعد {n} ثانية.','{a} مسموح بها سابقًا · {b} محظورة سابقًا'
    ],
    bn: [
      'এই নিয়ম বদলালে অন্য ওয়েবসাইটও প্রভাবিত হয়। অনুমোদিত ও ব্লক তালিকা আলাদাভাবে সংরক্ষিত থাকে।',
      'আপগ্রেড শেষ করতে একটি নিয়ম বেছে নিন।',
      'পুরোনো সেটআপে দুটি তালিকাই ছিল। এগোতে একটি নিয়ম বেছে নিন। আগের তথ্য পর্যালোচনার জন্য সংরক্ষিত থাকবে।',
      'এই ওয়েবসাইট ও তাদের সাবডোমেইন খোলা যাবে। নিচে নির্দিষ্ট সাবডোমেইন ব্লক করতে পারেন।',
      'এই ওয়েবসাইট ও তাদের সাবডোমেইন খোলা যাবে না।',
      'youtube.com-এর মতো একটি ওয়েবসাইটের নাম লিখুন। এর সাবডোমেইনও অন্তর্ভুক্ত হবে।',
      'তালিকা থেকে ওয়েবসাইট বেছে নিয়ে নির্বাচিত ওয়েবসাইট সরান চাপুন। এটি ফিরিয়ে আনা যায়।',
      'example.com অনুমোদন করলেও kids.example.com ও তার সাবডোমেইন ব্লক করতে পারেন।',
      'ব্লক করার ঠিকানা','আগে মূল ওয়েবসাইটকে অনুমোদিত তালিকায় যোগ করুন।','এখনও কোনো অংশ ব্লক করা হয়নি।',
      'কিছু সাইটে অন্য সাইটের কনটেন্ট দরকার হয়। এটি বন্ধ করলে ভিডিও, ছবি বা সাইন-ইন কাজ নাও করতে পারে।',
      'সাইন-ইন বা পেমেন্ট পেজ কেন ব্লক হতে পারে?',
      'যুক্ত সাইন-ইন বা পেমেন্ট পেজ অন্য ডোমেইন ব্যবহার করতে পারে। বিশ্বাস করলে সেটি অনুমোদিত তালিকায় যোগ করুন। এতে সরাসরিও খোলা যাবে।',
      'সাইট খোলা যাবে কি না দেখুন। এতে যুক্ত কনটেন্ট পরীক্ষা হয় না।',
      'আগের অনুমোদিত তথ্য','আগের অনুমোদিত তথ্য পর্যালোচনার জন্য সংরক্ষিত। কিছু এখনও ব্লক থাকতে পারে।',
      'পাসওয়ার্ড নিয়ম সুরক্ষায় সাহায্য করে। যে এক্সটেনশন পরিচালনা করতে পারে, সে BrowseLatch বন্ধ করতে পারে। আরও সুরক্ষার জন্য শিশুর অ্যাকাউন্ট ব্যবহার করুন।',
      'শুধু এই তালিকার ওয়েবসাইট খোলা যাবে। বাকি সব ব্লক।',
      'এই তালিকার ওয়েবসাইট ব্লক। বাকি সব খোলা যাবে।',
      'অনুমোদিত তালিকায় নেই বলে ব্লক করা হয়েছে।',
      'ব্লক তালিকায় নেই বলে অনুমোদিত।',
      'এই সাইট অনুমোদিত তালিকায় নেই।','এই সাইট ব্লক তালিকায় আছে।',
      'অনুমোদিত সাইটের এই অংশ ব্লক করা হয়েছে।',
      'পাঁচ মিনিট পর সেটিংস লক হয়েছে। চালিয়ে যেতে অভিভাবকের পাসওয়ার্ড দিন।',
      'সেটিংস লক করা। অভিভাবকের পাসওয়ার্ড দিন।',
      'প্রবেশাধিকার নিশ্চিত করা যায়নি। চালিয়ে যেতে অভিভাবকের পাসওয়ার্ড দিন।',
      'অতিরিক্ত কনটেন্ট অনুমোদিত','অন্য সাইটের অতিরিক্ত কনটেন্ট ব্লক',
      'এই সেটিং প্রয়োগ করতে পরিবর্তন সংরক্ষণ করুন চাপুন।','পাসওয়ার্ড বদলানো হয়েছে।','শেষ পরিবর্তন ফিরিয়ে আনা হয়েছে।',
      'ওয়েবসাইটের নিয়ম বদলানো হয়েছে।','এক্সটেনশনের সঙ্গে যোগাযোগ করা যায়নি।','সঠিক ওয়েবসাইট ঠিকানা বা ডোমেইন লিখুন।',
      '{site} ব্লক করা সাবডোমেইন বলে ব্লক হয়েছে।','{site} ও তার সাবডোমেইন অনুমোদন করুন।',
      '{site} ও তার সাবডোমেইন ব্লক করুন।','{site} অনুমোদিত তালিকায় যোগ হয়েছে।',
      '{site} ব্লক তালিকায় যোগ হয়েছে।','{site} সরানো হয়েছে।','{site} আগে থেকেই তালিকায় আছে।',
      '{site} আগে থেকেই ব্লক।','{site} এখন ব্লক।','{site} আর ব্লক নয়।',
      'অনুমোদিত তালিকা থেকে {site} সরান','ব্লক তালিকা থেকে {site} সরান',
      '{n} সেকেন্ড পরে আবার চেষ্টা করুন।','আগে {a}টি অনুমোদিত · {b}টি ব্লক'
    ],
    ru: [
      'Изменение этого правила влияет на другие сайты. Списки разрешённых и заблокированных сайтов сохраняются отдельно.',
      'Выберите правило, чтобы завершить обновление.',
      'Старые настройки использовали оба списка. Выберите правило для продолжения. Старые записи останутся для проверки.',
      'Эти сайты и их поддомены можно открывать. Отдельные поддомены можно заблокировать ниже.',
      'Эти сайты и их поддомены нельзя открывать.',
      'Введите сайт, например youtube.com. Его поддомены тоже будут включены.',
      'Выберите сайт в списке и нажмите Удалить выбранный сайт. Удаление можно отменить.',
      'Если разрешить example.com, всё равно можно заблокировать kids.example.com и его поддомены.',
      'Адрес для блокировки','Сначала добавьте основной сайт в список разрешённых.','Пока нет заблокированных частей.',
      'Некоторым сайтам нужен контент с других сайтов. Отключение может нарушить видео, изображения или вход.',
      'Почему страницы входа или оплаты могут быть заблокированы?',
      'Встроенная страница входа или оплаты может использовать другой домен. Если вы ему доверяете, добавьте его в список разрешённых. Тогда его можно будет открывать напрямую.',
      'Проверьте, можно ли открыть сайт. Встроенный контент не проверяется.',
      'Ранее разрешённые записи','Старые разрешённые записи сохранены для проверки. Некоторые могут оставаться заблокированными.',
      'Пароль помогает защитить правила. Человек с доступом к управлению расширениями может отключить BrowseLatch. Для более надёжной защиты используйте детскую учётную запись.',
      'Можно открывать только сайты из этого списка. Все остальные заблокированы.',
      'Сайты из этого списка заблокированы. Все остальные можно открывать.',
      'Заблокировано, потому что сайта нет в списке разрешённых.',
      'Разрешено, потому что сайта нет в списке заблокированных.',
      'Этого сайта нет в списке разрешённых.','Этот сайт есть в списке заблокированных.',
      'Эта часть разрешённого сайта заблокирована.',
      'Настройки заблокировались через пять минут. Введите родительский пароль для продолжения.',
      'Настройки заблокированы. Введите родительский пароль.',
      'Не удалось подтвердить доступ. Введите родительский пароль для продолжения.',
      'Дополнительный контент разрешён','Дополнительный контент с других сайтов заблокирован',
      'Нажмите Сохранить изменение, чтобы применить настройку.','Пароль изменён.','Последнее изменение отменено.',
      'Правило для сайтов изменено.','Не удалось связаться с расширением.','Введите допустимый адрес сайта или домен.',
      'Заблокировано, потому что {site} — заблокированный поддомен.','Разрешить {site} и его поддомены.',
      'Заблокировать {site} и его поддомены.','{site} добавлен в разрешённые сайты.',
      '{site} добавлен в заблокированные сайты.','{site} удалён.','{site} уже есть в списке.',
      '{site} уже заблокирован.','{site} теперь заблокирован.','{site} больше не заблокирован.',
      'Удалить {site} из разрешённых сайтов','Удалить {site} из заблокированных сайтов',
      'Повторите попытку через {n} секунд.','Ранее разрешено: {a} · ранее заблокировано: {b}'
    ],
    zh: [
      '更改此规则会影响其他网站。允许列表和阻止列表分别保存。',
      '选择一条规则以完成升级。',
      '旧设置同时使用两个列表。请选择一条规则继续。旧条目会保留以供检查。',
      '这些网站及其子域名可以打开。您可以在下方阻止特定子域名。',
      '这些网站及其子域名无法打开。',
      '输入网站名称，例如 youtube.com。其子域名也包括在内。',
      '在列表中选中网站，然后选择移除所选网站。您可以撤销移除。',
      '允许 example.com 后，仍可阻止 kids.example.com 及其子域名。',
      '要阻止的地址','请先将其主网站添加到允许的网站。','尚无被阻止的部分。',
      '有些网站需要其他网站的内容。关闭此选项可能使视频、图片或登录无法使用。',
      '为什么登录或付款页面可能被阻止？',
      '嵌入的登录或付款页面可能使用其他域名。如果信任该域名，请将其添加到允许的网站。这也允许直接访问。',
      '检查网站是否可以打开。此检查不包括嵌入内容。',
      '以前允许的条目','旧的允许条目保留以供检查。其中一些可能仍被阻止。',
      '密码有助于保护规则。能管理扩展程序的人可以关闭 BrowseLatch。使用儿童账户可获得更强保护。',
      '只有此列表中的网站可以打开。其他网站全部被阻止。',
      '此列表中的网站被阻止。其他网站均可打开。',
      '已阻止，因为它不在允许的网站列表中。',
      '已允许，因为它不在被阻止的网站列表中。',
      '此网站不在允许的网站列表中。','此网站在被阻止的网站列表中。',
      '已允许网站的这一部分被阻止。',
      '设置在五分钟后锁定。请输入家长密码以继续。',
      '设置已锁定。请输入家长密码。',
      '无法确认访问权限。请输入家长密码以继续。',
      '已允许额外内容','已阻止来自其他网站的额外内容',
      '选择保存更改以应用此设置。','密码已更改。','已撤销上次更改。',
      '网站规则已更改。','无法连接到扩展程序。','请输入有效的网站地址或域名。',
      '已阻止，因为 {site} 是被阻止的子域名。','允许 {site} 及其子域名。',
      '阻止 {site} 及其子域名。','{site} 已加入允许的网站。',
      '{site} 已加入被阻止的网站。','{site} 已移除。','{site} 已在列表中。',
      '{site} 已被阻止。','{site} 现在被阻止。','{site} 不再被阻止。',
      '从允许的网站中移除 {site}','从被阻止的网站中移除 {site}',
      '请在 {n} 秒后重试。','以前允许 {a} 个 · 以前阻止 {b} 个'
    ],
    id: [
      'Mengubah aturan ini memengaruhi situs lain. Daftar situs yang diizinkan dan diblokir disimpan terpisah.',
      'Pilih aturan untuk menyelesaikan pembaruan.',
      'Pengaturan lama memakai kedua daftar. Pilih satu aturan untuk melanjutkan. Entri lama tetap disimpan untuk ditinjau.',
      'Situs ini dan subdomainnya dapat dibuka. Anda dapat memblokir subdomain tertentu di bawah.',
      'Situs ini dan subdomainnya tidak dapat dibuka.',
      'Masukkan nama situs seperti youtube.com. Subdomainnya juga termasuk.',
      'Pilih situs dalam daftar, lalu pilih Hapus situs yang dipilih. Penghapusan dapat diurungkan.',
      'Jika example.com diizinkan, Anda masih dapat memblokir kids.example.com dan subdomainnya.',
      'Alamat yang akan diblokir','Tambahkan situs utamanya ke Situs yang diizinkan terlebih dahulu.','Belum ada bagian yang diblokir.',
      'Beberapa situs memerlukan konten dari situs lain. Menonaktifkannya dapat mengganggu video, gambar, atau login.',
      'Mengapa halaman login atau pembayaran dapat diblokir?',
      'Halaman login atau pembayaran yang tertanam mungkin memakai domain lain. Tambahkan domain itu ke Situs yang diizinkan jika Anda memercayainya. Ini juga mengizinkan kunjungan langsung.',
      'Periksa apakah situs dapat dibuka. Konten tertanam tidak ikut diperiksa.',
      'Entri yang sebelumnya diizinkan','Entri lama tetap disimpan untuk ditinjau. Sebagian mungkin masih diblokir.',
      'Kata sandi membantu melindungi aturan. Orang yang dapat mengelola ekstensi dapat menonaktifkan BrowseLatch. Gunakan akun anak untuk perlindungan lebih kuat.',
      'Hanya situs dalam daftar ini yang dapat dibuka. Semua situs lain diblokir.',
      'Situs dalam daftar ini diblokir. Semua situs lain dapat dibuka.',
      'Diblokir karena tidak ada dalam daftar situs yang diizinkan.',
      'Diizinkan karena tidak ada dalam daftar situs yang diblokir.',
      'Situs ini tidak ada dalam daftar yang diizinkan.','Situs ini ada dalam daftar yang diblokir.',
      'Bagian dari situs yang diizinkan ini diblokir.',
      'Pengaturan terkunci setelah lima menit. Masukkan kata sandi orang tua untuk melanjutkan.',
      'Pengaturan terkunci. Masukkan kata sandi orang tua.',
      'Akses tidak dapat dipastikan. Masukkan kata sandi orang tua untuk melanjutkan.',
      'Konten tambahan diizinkan','Konten tambahan dari situs lain diblokir',
      'Pilih Simpan perubahan untuk menerapkan pengaturan ini.','Kata sandi diubah.','Perubahan terakhir diurungkan.',
      'Aturan situs web diubah.','Tidak dapat menghubungi ekstensi.','Masukkan alamat situs atau domain yang valid.',
      'Diblokir karena {site} adalah subdomain yang diblokir.','Izinkan {site} dan subdomainnya.',
      'Blokir {site} dan subdomainnya.','{site} ditambahkan ke situs yang diizinkan.',
      '{site} ditambahkan ke situs yang diblokir.','{site} dihapus.','{site} sudah ada dalam daftar.',
      '{site} sudah diblokir.','{site} sekarang diblokir.','{site} tidak lagi diblokir.',
      'Hapus {site} dari situs yang diizinkan','Hapus {site} dari situs yang diblokir',
      'Coba lagi dalam {n} detik.','Sebelumnya diizinkan: {a} · sebelumnya diblokir: {b}'
    ]
  };
  for (const [code, values] of Object.entries(extra)) {
    if (values.length !== extraKeys.length) throw new Error(`Translation count mismatch: ${code} extras`);
    Object.assign(translations[code], Object.fromEntries(extraKeys.map((key, index) => [key, values[index]])));
  }
  const actionKeys = [
    'BrowseLatch website rules','Website blocked','Add this website','View saved rule',
    'View blocked subdomain','Allow this website','Block this website','Search this list',
    'Your previous version used both lists. Select one rule to continue.',
    'Settings are locked.','Too many attempts. Settings are temporarily locked.',
    'Current password is incorrect.','A parent password is already configured.',
    'Create a parent password first.','Settings changed in another tab. Reload before saving.',
    'The list changed in another tab. Reload settings before saving.',
    'Each blocked exception must be below an allowed parent domain.'
  ];
  const actions = {
    hi: ['BrowseLatch वेबसाइट नियम','वेबसाइट ब्लॉक','यह वेबसाइट जोड़ें','सहेजा नियम देखें','ब्लॉक उपडोमेन देखें','इस वेबसाइट को अनुमति दें','इस वेबसाइट को ब्लॉक करें','इस सूची में खोजें','पिछले संस्करण में दोनों सूचियाँ थीं। आगे बढ़ने के लिए एक नियम चुनें।','सेटिंग लॉक हैं।','बहुत कोशिशें की गईं। सेटिंग कुछ समय के लिए लॉक हैं।','वर्तमान पासवर्ड गलत है।','अभिभावक पासवर्ड पहले से बनाया गया है।','पहले अभिभावक पासवर्ड बनाएँ।','दूसरे टैब में सेटिंग बदली गईं। सहेजने से पहले फिर लोड करें।','दूसरे टैब में सूची बदली गई। सहेजने से पहले सेटिंग फिर लोड करें।','हर ब्लॉक अपवाद किसी अनुमत मुख्य डोमेन के अंतर्गत होना चाहिए।'],
    es: ['Reglas de sitios de BrowseLatch','Sitio bloqueado','Añadir este sitio','Ver regla guardada','Ver subdominio bloqueado','Permitir este sitio','Bloquear este sitio','Buscar en esta lista','La versión anterior usaba ambas listas. Elige una regla para continuar.','La configuración está bloqueada.','Demasiados intentos. La configuración está bloqueada temporalmente.','La contraseña actual es incorrecta.','Ya hay una contraseña parental configurada.','Primero crea una contraseña parental.','La configuración cambió en otra pestaña. Recarga antes de guardar.','La lista cambió en otra pestaña. Recarga la configuración antes de guardar.','Cada excepción bloqueada debe estar bajo un dominio principal permitido.'],
    fr: ['Règles des sites BrowseLatch','Site bloqué','Ajouter ce site','Voir la règle enregistrée','Voir le sous-domaine bloqué','Autoriser ce site','Bloquer ce site','Rechercher dans cette liste','La version précédente utilisait les deux listes. Choisissez une règle pour continuer.','Les paramètres sont verrouillés.','Trop de tentatives. Les paramètres sont temporairement verrouillés.','Le mot de passe actuel est incorrect.','Un mot de passe parental est déjà configuré.','Créez d’abord un mot de passe parental.','Les paramètres ont changé dans un autre onglet. Rechargez avant d’enregistrer.','La liste a changé dans un autre onglet. Rechargez les paramètres avant d’enregistrer.','Chaque exception bloquée doit appartenir à un domaine principal autorisé.'],
    pt: ['Regras de sites BrowseLatch','Site bloqueado','Adicionar este site','Ver regra salva','Ver subdomínio bloqueado','Permitir este site','Bloquear este site','Pesquisar nesta lista','A versão anterior usava as duas listas. Escolha uma regra para continuar.','As configurações estão bloqueadas.','Muitas tentativas. As configurações estão bloqueadas temporariamente.','A senha atual está incorreta.','Uma senha dos pais já está configurada.','Crie primeiro uma senha dos pais.','As configurações mudaram em outra aba. Recarregue antes de salvar.','A lista mudou em outra aba. Recarregue as configurações antes de salvar.','Cada exceção bloqueada deve estar sob um domínio principal permitido.'],
    ar: ['قواعد مواقع BrowseLatch','موقع محظور','إضافة هذا الموقع','عرض القاعدة المحفوظة','عرض النطاق الفرعي المحظور','السماح بهذا الموقع','حظر هذا الموقع','البحث في هذه القائمة','استخدم الإصدار السابق القائمتين. اختر قاعدة للمتابعة.','الإعدادات مقفلة.','محاولات كثيرة. الإعدادات مقفلة مؤقتًا.','كلمة المرور الحالية غير صحيحة.','تم إعداد كلمة مرور للوالد بالفعل.','أنشئ كلمة مرور للوالد أولًا.','تغيرت الإعدادات في علامة تبويب أخرى. أعد التحميل قبل الحفظ.','تغيرت القائمة في علامة تبويب أخرى. أعد تحميل الإعدادات قبل الحفظ.','يجب أن يكون كل استثناء محظور ضمن نطاق رئيسي مسموح به.'],
    bn: ['BrowseLatch ওয়েবসাইটের নিয়ম','ওয়েবসাইট ব্লক','এই ওয়েবসাইট যোগ করুন','সংরক্ষিত নিয়ম দেখুন','ব্লক করা সাবডোমেইন দেখুন','এই ওয়েবসাইট অনুমোদন করুন','এই ওয়েবসাইট ব্লক করুন','এই তালিকায় খুঁজুন','আগের সংস্করণে দুটি তালিকাই ছিল। এগোতে একটি নিয়ম বেছে নিন।','সেটিংস লক করা।','অনেকবার চেষ্টা করা হয়েছে। সেটিংস সাময়িকভাবে লক।','বর্তমান পাসওয়ার্ড ভুল।','অভিভাবকের পাসওয়ার্ড আগে থেকেই তৈরি আছে।','আগে অভিভাবকের পাসওয়ার্ড তৈরি করুন।','অন্য ট্যাবে সেটিংস বদলেছে। সংরক্ষণের আগে আবার লোড করুন।','অন্য ট্যাবে তালিকা বদলেছে। সংরক্ষণের আগে সেটিংস আবার লোড করুন।','প্রতিটি ব্লক ব্যতিক্রম অনুমোদিত মূল ডোমেইনের অধীনে থাকতে হবে।'],
    ru: ['Правила сайтов BrowseLatch','Сайт заблокирован','Добавить этот сайт','Посмотреть сохранённое правило','Посмотреть заблокированный поддомен','Разрешить этот сайт','Заблокировать этот сайт','Поиск в списке','Предыдущая версия использовала оба списка. Выберите правило для продолжения.','Настройки заблокированы.','Слишком много попыток. Настройки временно заблокированы.','Текущий пароль неверен.','Родительский пароль уже задан.','Сначала создайте родительский пароль.','Настройки изменились в другой вкладке. Перезагрузите перед сохранением.','Список изменился в другой вкладке. Перезагрузите настройки перед сохранением.','Каждое исключение должно быть поддоменом разрешённого основного домена.'],
    zh: ['BrowseLatch 网站规则','网站已被阻止','添加此网站','查看已保存的规则','查看被阻止的子域名','允许此网站','阻止此网站','搜索此列表','旧版本同时使用两个列表。请选择一条规则继续。','设置已锁定。','尝试次数过多。设置暂时锁定。','当前密码错误。','家长密码已经设置。','请先创建家长密码。','设置已在另一个标签页中更改。请重新加载后再保存。','列表已在另一个标签页中更改。请重新加载设置后再保存。','每个阻止例外都必须属于已允许的主域名。'],
    id: ['Aturan situs BrowseLatch','Situs diblokir','Tambahkan situs ini','Lihat aturan tersimpan','Lihat subdomain yang diblokir','Izinkan situs ini','Blokir situs ini','Cari dalam daftar ini','Versi sebelumnya memakai kedua daftar. Pilih satu aturan untuk melanjutkan.','Pengaturan terkunci.','Terlalu banyak percobaan. Pengaturan terkunci sementara.','Kata sandi saat ini salah.','Kata sandi orang tua sudah disetel.','Buat kata sandi orang tua terlebih dahulu.','Pengaturan berubah di tab lain. Muat ulang sebelum menyimpan.','Daftar berubah di tab lain. Muat ulang pengaturan sebelum menyimpan.','Setiap pengecualian yang diblokir harus berada di bawah domain utama yang diizinkan.']
  };
  for (const [code, values] of Object.entries(actions)) {
    if (values.length !== actionKeys.length) throw new Error(`Translation count mismatch: ${code} actions`);
    Object.assign(translations[code], Object.fromEntries(actionKeys.map((key, index) => [key, values[index]])));
  }
  const shortKeys = ['Remove selected address','{n} blocked subdomain exceptions are active.','1 website','1 result'];
  const short = {
    hi: ['चुना हुआ पता हटाएँ','{n} ब्लॉक उपडोमेन अपवाद सक्रिय हैं।','1 वेबसाइट','1 परिणाम'],
    es: ['Quitar la dirección seleccionada','Hay {n} excepciones de subdominios bloqueados activas.','1 sitio','1 resultado'],
    fr: ['Supprimer l’adresse sélectionnée','{n} exceptions de sous-domaines bloqués sont actives.','1 site','1 résultat'],
    pt: ['Remover endereço selecionado','{n} exceções de subdomínios bloqueados estão ativas.','1 site','1 resultado'],
    ar: ['إزالة العنوان المحدد','هناك {n} استثناءات نشطة لنطاقات فرعية محظورة.','موقع واحد','نتيجة واحدة'],
    bn: ['নির্বাচিত ঠিকানা সরান','{n}টি ব্লক সাবডোমেইন ব্যতিক্রম চালু আছে।','১টি ওয়েবসাইট','১টি ফলাফল'],
    ru: ['Удалить выбранный адрес','Активно исключений заблокированных поддоменов: {n}.','1 сайт','1 результат'],
    zh: ['移除所选地址','有 {n} 个被阻止的子域名例外处于启用状态。','1 个网站','1 个结果'],
    id: ['Hapus alamat yang dipilih','{n} pengecualian subdomain yang diblokir aktif.','1 situs','1 hasil']
  };
  for (const [code, values] of Object.entries(short)) {
    Object.assign(translations[code], Object.fromEntries(shortKeys.map((key, index) => [key, values[index]])));
  }
  const errorKeys = [
    'Use a domain only (no URL, path, port or wildcard): {site}',
    'Invalid domain: {site}', 'Enter a specific website, not a domain suffix: {site}',
    'Use at least 8 characters.', 'Password must be 128 characters or fewer.',
    'Enter a list of at most 500 domains.', 'The maximum is 500 domains.',
    'Choose a list mode before editing websites.', 'This setting applies only in Allowlist mode.',
    'Choose whether supporting resources can load.', 'This resource setting is already active.',
    'Choose Allowlist or Blocklist mode.', 'This mode is already active.',
    'Blocked exceptions only apply in Allowlist mode.'
  ];
  const errors = {
    hi: ['केवल डोमेन डालें (URL, पथ, पोर्ट या वाइल्डकार्ड नहीं): {site}','अमान्य डोमेन: {site}','डोमेन प्रत्यय नहीं, कोई विशिष्ट वेबसाइट डालें: {site}','कम-से-कम 8 अक्षर उपयोग करें।','पासवर्ड 128 अक्षरों से अधिक नहीं होना चाहिए।','अधिकतम 500 डोमेन की सूची डालें।','अधिकतम 500 डोमेन हो सकते हैं।','वेबसाइट बदलने से पहले सूची का नियम चुनें।','यह सेटिंग केवल अनुमति सूची में लागू होती है।','चुनें कि सहायक सामग्री लोड हो सकती है या नहीं।','यह सामग्री सेटिंग पहले से लागू है।','अनुमति या ब्लॉक सूची का नियम चुनें।','यह नियम पहले से लागू है।','ब्लॉक अपवाद केवल अनुमति सूची में लागू होते हैं।'],
    es: ['Escribe solo un dominio (sin URL, ruta, puerto ni comodín): {site}','Dominio no válido: {site}','Escribe un sitio concreto, no un sufijo de dominio: {site}','Usa al menos 8 caracteres.','La contraseña debe tener 128 caracteres como máximo.','Escribe una lista de 500 dominios como máximo.','El máximo es 500 dominios.','Elige una regla antes de editar sitios.','Esta opción solo se aplica en el modo de sitios permitidos.','Elige si puede cargarse el contenido de apoyo.','Esta opción de contenido ya está activa.','Elige el modo de sitios permitidos o bloqueados.','Este modo ya está activo.','Las excepciones bloqueadas solo se aplican en el modo de sitios permitidos.'],
    fr: ['Saisissez seulement un domaine (sans URL, chemin, port ou joker) : {site}','Domaine non valide : {site}','Saisissez un site précis, pas un suffixe de domaine : {site}','Utilisez au moins 8 caractères.','Le mot de passe doit contenir au plus 128 caractères.','Saisissez au plus 500 domaines.','La limite est de 500 domaines.','Choisissez une règle avant de modifier les sites.','Ce réglage s’applique seulement au mode des sites autorisés.','Choisissez si le contenu supplémentaire peut se charger.','Ce réglage de contenu est déjà actif.','Choisissez le mode des sites autorisés ou bloqués.','Ce mode est déjà actif.','Les exceptions bloquées ne s’appliquent qu’au mode des sites autorisés.'],
    pt: ['Digite apenas um domínio (sem URL, caminho, porta ou curinga): {site}','Domínio inválido: {site}','Digite um site específico, não um sufixo de domínio: {site}','Use pelo menos 8 caracteres.','A senha deve ter no máximo 128 caracteres.','Digite uma lista de no máximo 500 domínios.','O máximo é 500 domínios.','Escolha uma regra antes de editar sites.','Esta configuração só vale no modo de sites permitidos.','Escolha se o conteúdo de apoio pode carregar.','Esta configuração de conteúdo já está ativa.','Escolha o modo de sites permitidos ou bloqueados.','Este modo já está ativo.','As exceções bloqueadas só valem no modo de sites permitidos.'],
    ar: ['أدخل نطاقًا فقط (دون رابط أو مسار أو منفذ أو رمز بدل): {site}','نطاق غير صالح: {site}','أدخل موقعًا محددًا لا لاحقة نطاق: {site}','استخدم 8 أحرف على الأقل.','يجب ألا تتجاوز كلمة المرور 128 حرفًا.','أدخل قائمة لا تتجاوز 500 نطاق.','الحد الأقصى 500 نطاق.','اختر قاعدة قبل تعديل المواقع.','ينطبق هذا الإعداد على وضع قائمة السماح فقط.','اختر ما إذا كان المحتوى المساعد يمكن تحميله.','إعداد المحتوى هذا نشط بالفعل.','اختر وضع قائمة السماح أو الحظر.','هذا الوضع نشط بالفعل.','تنطبق استثناءات الحظر في وضع قائمة السماح فقط.'],
    bn: ['শুধু ডোমেইন লিখুন (URL, পথ, পোর্ট বা ওয়াইল্ডকার্ড নয়): {site}','ভুল ডোমেইন: {site}','ডোমেইন প্রত্যয় নয়, নির্দিষ্ট ওয়েবসাইট লিখুন: {site}','অন্তত ৮টি অক্ষর ব্যবহার করুন।','পাসওয়ার্ড ১২৮ অক্ষরের বেশি হতে পারবে না।','সর্বোচ্চ ৫০০টি ডোমেইনের তালিকা দিন।','সর্বোচ্চ ৫০০টি ডোমেইন রাখা যায়।','ওয়েবসাইট বদলানোর আগে তালিকার নিয়ম বেছে নিন।','এটি শুধু অনুমোদিত তালিকার মোডে প্রযোজ্য।','সহায়ক কনটেন্ট লোড হবে কি না বেছে নিন।','এই কনটেন্ট সেটিং আগে থেকেই চালু।','অনুমোদিত বা ব্লক তালিকার মোড বেছে নিন।','এই মোড আগে থেকেই চালু।','ব্লক ব্যতিক্রম শুধু অনুমোদিত তালিকার মোডে প্রযোজ্য।'],
    ru: ['Введите только домен (без URL, пути, порта или шаблона): {site}','Недопустимый домен: {site}','Введите конкретный сайт, а не доменный суффикс: {site}','Используйте не менее 8 символов.','Пароль должен содержать не более 128 символов.','Введите список не более чем из 500 доменов.','Максимум — 500 доменов.','Выберите правило перед изменением сайтов.','Этот параметр действует только в режиме разрешённых сайтов.','Выберите, можно ли загружать дополнительный контент.','Этот параметр уже действует.','Выберите режим разрешённых или заблокированных сайтов.','Этот режим уже действует.','Исключения блокировки действуют только в режиме разрешённых сайтов.'],
    zh: ['只输入域名（不含网址、路径、端口或通配符）：{site}','无效域名：{site}','请输入具体网站，而不是域名后缀：{site}','请至少使用 8 个字符。','密码不得超过 128 个字符。','最多输入 500 个域名。','最多允许 500 个域名。','请先选择列表模式再编辑网站。','此设置仅适用于允许列表模式。','请选择是否加载辅助内容。','此内容设置已经生效。','请选择允许列表或阻止列表模式。','此模式已经生效。','阻止例外仅适用于允许列表模式。'],
    id: ['Masukkan domain saja (tanpa URL, jalur, port, atau karakter bebas): {site}','Domain tidak valid: {site}','Masukkan situs tertentu, bukan akhiran domain: {site}','Gunakan minimal 8 karakter.','Kata sandi maksimal 128 karakter.','Masukkan daftar maksimal 500 domain.','Batasnya 500 domain.','Pilih aturan daftar sebelum mengubah situs.','Pengaturan ini hanya berlaku dalam mode daftar izin.','Pilih apakah konten pendukung dapat dimuat.','Pengaturan konten ini sudah aktif.','Pilih mode daftar izin atau daftar blokir.','Mode ini sudah aktif.','Pengecualian blokir hanya berlaku dalam mode daftar izin.']
  };
  for (const [code, values] of Object.entries(errors)) {
    if (values.length !== errorKeys.length) throw new Error(`Translation count mismatch: ${code} errors`);
    Object.assign(translations[code], Object.fromEntries(errorKeys.map((key, index) => [key, values[index]])));
  }
  const confirmKeys = [
    'Block websites on this list? All other websites will be allowed.',
    'Allow only websites on this list? All other websites will be blocked.',
    'Your allowed and blocked lists are saved separately.'
  ];
  const confirms = {
    hi: ['इस सूची की वेबसाइटें ब्लॉक करें? बाकी सभी वेबसाइटें खुल सकेंगी।','केवल इस सूची की वेबसाइटों को अनुमति दें? बाकी सभी ब्लॉक होंगी।','अनुमत और ब्लॉक सूचियाँ अलग-अलग सहेजी जाती हैं।'],
    es: ['¿Bloquear los sitios de esta lista? Los demás sitios estarán permitidos.','¿Permitir solo los sitios de esta lista? Los demás sitios estarán bloqueados.','Las listas de sitios permitidos y bloqueados se guardan por separado.'],
    fr: ['Bloquer les sites de cette liste ? Tous les autres sites seront autorisés.','Autoriser uniquement les sites de cette liste ? Tous les autres sites seront bloqués.','Les listes autorisées et bloquées sont enregistrées séparément.'],
    pt: ['Bloquear os sites desta lista? Todos os outros serão permitidos.','Permitir apenas os sites desta lista? Todos os outros serão bloqueados.','As listas de sites permitidos e bloqueados são salvas separadamente.'],
    ar: ['هل تريد حظر المواقع في هذه القائمة؟ سيُسمح بجميع المواقع الأخرى.','هل تريد السماح بمواقع هذه القائمة فقط؟ ستُحظر جميع المواقع الأخرى.','تُحفظ قائمتا السماح والحظر كل على حدة.'],
    bn: ['এই তালিকার ওয়েবসাইট ব্লক করবেন? অন্য সব ওয়েবসাইট খোলা যাবে।','শুধু এই তালিকার ওয়েবসাইট অনুমোদন করবেন? অন্য সব ব্লক হবে।','অনুমোদিত ও ব্লক তালিকা আলাদাভাবে সংরক্ষিত থাকে।'],
    ru: ['Заблокировать сайты из этого списка? Все остальные сайты будут разрешены.','Разрешить только сайты из этого списка? Все остальные будут заблокированы.','Списки разрешённых и заблокированных сайтов сохраняются отдельно.'],
    zh: ['阻止此列表中的网站？其他所有网站都将被允许。','仅允许此列表中的网站？其他所有网站都将被阻止。','允许列表和阻止列表分别保存。'],
    id: ['Blokir situs dalam daftar ini? Semua situs lain akan diizinkan.','Izinkan hanya situs dalam daftar ini? Semua situs lain akan diblokir.','Daftar situs yang diizinkan dan diblokir disimpan terpisah.']
  };
  for (const [code, values] of Object.entries(confirms)) {
    Object.assign(translations[code], Object.fromEntries(confirmKeys.map((key, index) => [key, values[index]])));
  }
  const returnKeys = ['Allow and open website', 'Saved. Opening the requested website.', 'Saved. Return to the website and reload it.'];
  const returnMessages = {
    hi: ['अनुमति दें और वेबसाइट खोलें', 'सहेज लिया गया। अनुरोधित वेबसाइट खुल रही है।', 'सहेज लिया गया। वेबसाइट पर लौटें और उसे फिर लोड करें।'],
    es: ['Permitir y abrir el sitio', 'Guardado. Abriendo el sitio web solicitado.', 'Guardado. Vuelve al sitio web y recárgalo.'],
    fr: ['Autoriser et ouvrir le site', 'Enregistré. Ouverture du site demandé.', 'Enregistré. Revenez au site et rechargez-le.'],
    pt: ['Permitir e abrir o site', 'Salvo. Abrindo o site solicitado.', 'Salvo. Volte ao site e recarregue a página.'],
    ar: ['السماح بالموقع وفتحه', 'تم الحفظ. جارٍ فتح الموقع المطلوب.', 'تم الحفظ. عُد إلى الموقع وأعد تحميله.'],
    bn: ['অনুমতি দিন এবং ওয়েবসাইট খুলুন', 'সংরক্ষিত হয়েছে। অনুরোধ করা ওয়েবসাইট খোলা হচ্ছে।', 'সংরক্ষিত হয়েছে। ওয়েবসাইটে ফিরে গিয়ে আবার লোড করুন।'],
    ru: ['Разрешить и открыть сайт', 'Сохранено. Открываем запрошенный сайт.', 'Сохранено. Вернитесь на сайт и обновите страницу.'],
    zh: ['允许并打开网站', '已保存。正在打开请求的网站。', '已保存。请返回网站并重新加载。'],
    id: ['Izinkan dan buka situs', 'Tersimpan. Membuka situs yang diminta.', 'Tersimpan. Kembali ke situs dan muat ulang.']
  };
  for (const [code, values] of Object.entries(returnMessages)) {
    Object.assign(translations[code], Object.fromEntries(returnKeys.map((key, index) => [key, values[index]])));
  }
  const patterns = [
    [/^Use a domain only \(no URL, path, port or wildcard\): (.+)$/, 'Use a domain only (no URL, path, port or wildcard): {site}', ['site']],
    [/^Invalid domain: (.+)$/, 'Invalid domain: {site}', ['site']],
    [/^Enter a specific website, not a domain suffix: (.+)$/, 'Enter a specific website, not a domain suffix: {site}', ['site']],
    [/^Parent access · locks in (\d+) min$/, 'Parent access · locks in {n} min', ['n']],
    [/^1 website$/, '1 website', []],
    [/^1 result$/, '1 result', []],
    [/^(\d+) websites?$/, '{n} websites', ['n']],
    [/^(\d+) results?$/, '{n} results', ['n']],
    [/^(\d+) blocked subdomain exceptions? (?:is|are) active\.$/, '{n} blocked subdomain exceptions are active.', ['n']],
    [/^Allowed by (.+)\.$/, 'Allowed by {site}.', ['site']],
    [/^Blocked by (.+)\.$/, 'Blocked by {site}.', ['site']],
    [/^Blocked because (.+) is a blocked subdomain\.$/, 'Blocked because {site} is a blocked subdomain.', ['site']],
    [/^Allow (.+) and its subdomains\.$/, 'Allow {site} and its subdomains.', ['site']],
    [/^Block (.+) and its subdomains\.$/, 'Block {site} and its subdomains.', ['site']],
    [/^(.+) added to allowed websites\.$/, '{site} added to allowed websites.', ['site']],
    [/^(.+) added to blocked websites\.$/, '{site} added to blocked websites.', ['site']],
    [/^(.+) removed\.$/, '{site} removed.', ['site']],
    [/^(.+) is already listed\.$/, '{site} is already listed.', ['site']],
    [/^(.+) is already blocked\.$/, '{site} is already blocked.', ['site']],
    [/^(.+) is now blocked\.$/, '{site} is now blocked.', ['site']],
    [/^(.+) is no longer blocked as part of an allowed website\.$/, '{site} is no longer blocked.', ['site']],
    [/^Remove (.+) from allowed websites$/, 'Remove {site} from allowed websites', ['site']],
    [/^Remove (.+) from blocked websites$/, 'Remove {site} from blocked websites', ['site']],
    [/^Too many attempts\. Try again in (\d+) seconds\.$/, 'Try again in {n} seconds.', ['n']],
    [/^(\d+) previously allowed · (\d+) previously blocked$/, '{a} previously allowed · {b} previously blocked', ['a', 'b']]
  ];
  const displayed = new WeakMap();
  const sourceTitle = document.title;
  let language = 'en';
  let observer;

  function translated(raw) {
    if (language === 'en' || !raw.trim()) return raw;
    const lead = raw.match(/^\s*/u)[0];
    const tail = raw.match(/\s*$/u)[0];
    const source = raw.trim();
    const dictionary = translations[language] || {};
    let value = dictionary[source];
    if (!value) {
      for (const [pattern, key, names] of patterns) {
        const match = source.match(pattern);
        if (!match || !dictionary[key]) continue;
        value = dictionary[key];
        names.forEach((name, index) => {
          const variable = language === 'ar' && name === 'site' ? `\u2068${match[index + 1]}\u2069` : match[index + 1];
          value = value.replace(`{${name}}`, variable);
        });
        break;
      }
    }
    if (!value && source.startsWith('Not saved: ')) value = `${dictionary['Not saved:'] || 'Not saved:'} ${translated(source.slice(11)).trim()}`;
    if (!value && source.startsWith('Mode not changed: ')) value = `${dictionary['Mode not changed:'] || 'Mode not changed:'} ${translated(source.slice(18)).trim()}`;
    if (!value && source.endsWith(' Reload any open website tabs to see the change.')) {
      const prefix = source.slice(0, -' Reload any open website tabs to see the change.'.length);
      let translatedPrefix = translated(prefix).trim();
      if (translatedPrefix === prefix && prefix.endsWith('.')) {
        const withoutPeriod = prefix.slice(0, -1);
        const translatedWithoutPeriod = translated(withoutPeriod).trim();
        if (translatedWithoutPeriod !== withoutPeriod) translatedPrefix = `${translatedWithoutPeriod}.`;
      }
      const translatedSuffix = dictionary['Reload any open website tabs to see the change.'];
      if (translatedPrefix !== prefix || translatedSuffix) value = `${translatedPrefix} ${translatedSuffix || 'Reload any open website tabs to see the change.'}`;
    }
    const allowSummary = 'Only websites on this list can open. All others are blocked.';
    if (!value && source.startsWith(`${allowSummary} `)) {
      const rest = source.slice(allowSummary.length + 1);
      const translatedRest = translated(rest).trim();
      if (translatedRest !== rest) value = `${dictionary[allowSummary] || allowSummary} ${translatedRest}`;
    }
    if (!value && /^[-\w.]+: /.test(source)) {
      const colon = source.indexOf(': ');
      const rest = source.slice(colon + 2);
      const translatedRest = translated(rest).trim();
      if (translatedRest !== rest) value = `${source.slice(0, colon)}: ${translatedRest}`;
    }
    return value ? `${lead}${value}${tail}` : raw;
  }

  function translateNode(node) {
    const prior = displayed.get(node);
    const current = node.nodeValue;
    const source = prior && current === prior.rendered ? prior.source : current;
    const next = translated(source);
    displayed.set(node, {source, rendered: next});
    if (current !== next) node.nodeValue = next;
  }

  function translateAttribute(element, name) {
    const current = element.getAttribute(name);
    if (current === null) return;
    let entry = displayed.get(element);
    if (!entry) { entry = {}; displayed.set(element, entry); }
    const prior = entry[name];
    const source = prior && current === prior.rendered ? prior.source : current;
    const next = translated(source);
    entry[name] = {source, rendered: next};
    if (current !== next) element.setAttribute(name, next);
  }

  function render() {
    if (!document?.body) { observer?.disconnect(); return; }
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.title = translated(sourceTitle);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) translateNode(walker.currentNode);
    for (const element of document.body.querySelectorAll('[placeholder],[aria-label],[title]')) {
      for (const name of ['placeholder', 'aria-label', 'title']) translateAttribute(element, name);
    }
    const selector = document.querySelector('#language');
    if (selector && selector.value !== language) selector.value = language;
  }

  function setLanguage(next) {
    language = Object.hasOwn(languages, next) ? next : 'en';
    render();
  }

  const selector = document.querySelector('#language');
  for (const [code, name] of Object.entries(languages)) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = name;
    selector.append(option);
  }
  selector.addEventListener('change', async () => {
    setLanguage(selector.value);
    await chrome.storage.local?.set({uiLanguage: language});
  });
  observer = new MutationObserver(render);
  observer.observe(document.body, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title']});
  const browserLanguage = (navigator.language || 'en').toLowerCase().split('-')[0];
  setLanguage(browserLanguage);
  chrome.storage.local?.get('uiLanguage').then(({uiLanguage}) => {
    if (uiLanguage) setLanguage(uiLanguage);
  }).catch(() => {});
  chrome.storage.onChanged?.addListener((changes, area) => {
    if (area === 'local' && changes.uiLanguage?.newValue) setLanguage(changes.uiLanguage.newValue);
  });
  window.BrowseLatchI18n = {setLanguage, translated, languages};
})();
