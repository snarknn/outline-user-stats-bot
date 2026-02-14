import type { Locale } from "./config";

type Dict = Record<string, string>;

const RU: Dict = {
  welcome: "Привет! Отправьте ваш ключ доступа в формате ss://...",
  help: "Команды: /status, /help, /lang ru|en",
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
  warnHigh: "Внимание: использовано {{percent}}% лимита. После 100% VPN будет недоступен, пока расход за последние 30 дней не опустится ниже 100%.",
  vpnBlocked: "Лимит достиг 100% или выше. VPN сейчас недоступен, пока расход за последние 30 дней не опустится ниже 100%.",
  vpnRestored: "Расход снова ниже 100%. VPN снова доступен.",
  langSet: "Язык установлен: {{lang}}.",
  error: "Произошла ошибка. Попробуйте позже.",
  outlineNoMatch: "Не удалось найти пользователя по этому ключу.",
  outlineApiError: "Ошибка при обращении к серверу Outline."
};

const EN: Dict = {
  welcome: "Hi! Send your access key in the format ss://...",
  help: "Commands: /status, /help, /lang ru|en",
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
  warnHigh: "Warning: {{percent}}% of your limit is used. After 100%, VPN will be unavailable until your last-30-days usage drops below 100%.",
  vpnBlocked: "Your usage reached 100% or more. VPN is unavailable until your last-30-days usage drops below 100%.",
  vpnRestored: "Your usage is below 100% again. VPN is available again.",
  langSet: "Language set to: {{lang}}.",
  error: "Something went wrong. Please try again later.",
  outlineNoMatch: "No user found for this key.",
  outlineApiError: "Outline server request failed."
};

const DICTS: Record<Locale, Dict> = { ru: RU, en: EN };

export function t(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const dict = DICTS[locale] || RU;
  let text = dict[key] || RU[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`{{${k}}}`, "g"), String(v));
    }
  }
  return text;
}
