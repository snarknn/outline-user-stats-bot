import type { Locale } from "./config";

type Dict = Record<string, string>;

const EN: Dict = {
  welcome: "Hi! Send your access key in the format ss://...",
  help: "Commands: /status, /help, /lang en|ru|zh|fa",
  helpDetails:
    "What the bot shows:\n" +
    "• /status — how much traffic is used and your limit (if a limit is set).\n" +
    "• If no limit is set, we still show how much traffic is already used.\n" +
    "• Units: KiB, MiB, GiB. MiB values are rounded to whole numbers for readability.\n" +
    "• Important: this is not a calendar month. Values are calculated for the last 30 days (a moving period recalculated daily).\n" +
    "• Notifications are sent after 50% and then at each next 10% (60%, 70%, etc.).",
  keyLinked: "Key linked. You can now use /status.",
  statusNoKey: "Please send your ss:// access key first.",
  statusUsedNoLimit: "No data limit is set for your key. Already used: {{used}}.",
  statusOk: "Used: {{used}} of {{limit}} ({{percent}}%).",
  statusAsOf: "Data as of: {{updatedAt}}",
  statusRefreshRate: "Data is refreshed about every {{minutes}} min.",
  warn: "Warning: {{percent}}% of your limit is used.",
  warnHigh:
    "Warning: {{percent}}% of your limit is used. After 100%, VPN will be unavailable until your last-30-days usage drops below 100%.",
  vpnBlocked: "Your usage reached 100% or more. VPN is unavailable until your last-30-days usage drops below 100%.",
  vpnRestored: "Your usage is below 100% again. VPN is available again.",
  langSet: "Language set to: {{lang}}.",
  error: "Something went wrong. Please try again later.",
  outlineNoMatch: "No user found for this key.",
  outlineApiError: "Outline server request failed."
};

const RU: Dict = {
  welcome: "Привет! Отправьте ваш ключ доступа в формате ss://...",
  help: "Команды: /status, /help, /lang en|ru|zh|fa",
  helpDetails:
    "Что показывает бот:\n" +
    "• /status — сколько трафика уже израсходовано и какой лимит (если лимит задан).\n" +
    "• Если лимита нет, всё равно показываем, сколько уже потрачено.\n" +
    "• Единицы: KiB, MiB, GiB. Значение в MiB округляется до целого для удобства.\n" +
    "• Важный момент: это не календарный месяц. Считаем за последние 30 дней (плавающий период, пересчитывается каждый день).\n" +
    "• Уведомления приходят после 50% и дальше на каждом шаге 10% (60%, 70% и т.д.).",
  keyLinked: "Ключ привязан. Теперь можно использовать /status.",
  statusNoKey: "Сначала отправьте ключ доступа ss://...",
  statusUsedNoLimit: "Лимит для вашего ключа не установлен. Уже использовано: {{used}}.",
  statusOk: "Использовано: {{used}} из {{limit}} ({{percent}}%).",
  statusAsOf: "Данные по состоянию на: {{updatedAt}}",
  statusRefreshRate: "Данные обновляются примерно каждые {{minutes}} мин.",
  warn: "Внимание: использовано {{percent}}% лимита.",
  warnHigh:
    "Внимание: использовано {{percent}}% лимита. После 100% VPN будет недоступен, пока расход за последние 30 дней не опустится ниже 100%.",
  vpnBlocked:
    "Лимит достиг 100% или выше. VPN сейчас недоступен, пока расход за последние 30 дней не опустится ниже 100%.",
  vpnRestored: "Расход снова ниже 100%. VPN снова доступен.",
  langSet: "Язык установлен: {{lang}}.",
  error: "Произошла ошибка. Попробуйте позже.",
  outlineNoMatch: "Не удалось найти пользователя по этому ключу.",
  outlineApiError: "Ошибка при обращении к серверу Outline."
};

const ZH: Dict = {
  welcome: "你好！请发送你的访问密钥，格式为 ss://...",
  help: "命令：/status，/help，/lang en|ru|zh|fa",
  helpDetails:
    "机器人会显示：\n" +
    "• /status — 已使用流量以及限额（若设置了限额）。\n" +
    "• 没有设置限额时，也会显示已使用流量。\n" +
    "• 单位：KiB、MiB、GiB。MiB 会取整以便阅读。\n" +
    "• 重要：不是按自然月统计，而是最近 30 天（每天滚动刷新）。\n" +
    "• 提醒在 50% 后每 10% 发送一次（60%、70% 等）。",
  keyLinked: "密钥已绑定，现在可以使用 /status。",
  statusNoKey: "请先发送 ss:// 访问密钥。",
  statusUsedNoLimit: "未设置流量上限。已使用：{{used}}。",
  statusOk: "已使用：{{used}} / {{limit}}（{{percent}}%）。",
  statusAsOf: "数据更新时间：{{updatedAt}}",
  statusRefreshRate: "数据大约每 {{minutes}} 分钟更新一次。",
  warn: "注意：已使用 {{percent}}% 的限额。",
  warnHigh: "注意：已使用 {{percent}}% 的限额。达到 100% 后 VPN 将不可用，直到最近 30 天用量降到 100% 以下。",
  vpnBlocked: "用量达到 100% 或以上。VPN 暂不可用，直到最近 30 天用量降到 100% 以下。",
  vpnRestored: "用量已降至 100% 以下，VPN 已恢复可用。",
  langSet: "语言已设置为：{{lang}}。",
  error: "发生错误，请稍后再试。",
  outlineNoMatch: "未能找到与该密钥匹配的用户。",
  outlineApiError: "请求 Outline 服务器失败。"
};

const FA: Dict = {
  welcome: "سلام! لطفا کلید دسترسی خود را با قالب ss://... ارسال کنید",
  help: "دستورات: /status، /help، /lang en|ru|zh|fa",
  helpDetails:
    "بات نمایش می‌دهد:\n" +
    "• /status — میزان مصرف و سقف (اگر تنظیم شده باشد).\n" +
    "• اگر سقف وجود نداشته باشد، باز هم میزان مصرف نمایش داده می‌شود.\n" +
    "• واحدها: KiB، MiB، GiB. مقدار MiB برای خوانایی گرد می‌شود.\n" +
    "• مهم: ماه تقویمی نیست؛ بازه ۳۰ روز گذشته است (هر روز به‌روزرسانی می‌شود).\n" +
    "• هشدارها از 50% و سپس هر 10% (60%، 70% و غیره) ارسال می‌شوند.",
  keyLinked: "کلید متصل شد. حالا می‌توانید /status را استفاده کنید.",
  statusNoKey: "ابتدا کلید دسترسی ss:// را ارسال کنید.",
  statusUsedNoLimit: "سقف برای کلید شما تنظیم نشده است. مصرف شده: {{used}}.",
  statusOk: "مصرف: {{used}} از {{limit}} ({{percent}}%).",
  statusAsOf: "اطلاعات تا زمان: {{updatedAt}}",
  statusRefreshRate: "اطلاعات تقریبا هر {{minutes}} دقیقه به‌روزرسانی می‌شود.",
  warn: "هشدار: {{percent}}% از سقف استفاده شده است.",
  warnHigh:
    "هشدار: {{percent}}% از سقف استفاده شده است. پس از 100%، VPN تا زمانی که مصرف ۳۰ روزه به زیر 100% برسد، در دسترس نخواهد بود.",
  vpnBlocked: "مصرف به 100% یا بیشتر رسیده است. VPN تا پایین آمدن مصرف ۳۰ روزه به زیر 100% در دسترس نیست.",
  vpnRestored: "مصرف دوباره زیر 100% قرار گرفت. VPN دوباره در دسترس است.",
  langSet: "زبان تنظیم شد: {{lang}}.",
  error: "خطایی رخ داد. لطفا بعدا تلاش کنید.",
  outlineNoMatch: "کاربری برای این کلید پیدا نشد.",
  outlineApiError: "درخواست به سرور Outline ناموفق بود."
};

const DICTS: Record<Locale, Dict> = { en: EN, ru: RU, zh: ZH, fa: FA };

export function t(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const dict = DICTS[locale] || EN;
  let text = dict[key] || EN[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`{{${k}}}`, "g"), String(v));
    }
  }
  return text;
}
