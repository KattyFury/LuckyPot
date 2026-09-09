import { useLanguage, type Language } from "../i18n/LanguageContext";

const OPTIONS: { value: Language; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "vi", label: "VI" },
];

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <span className="token-toggle" role="group" aria-label="Language">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={value === lang ? "is-active" : undefined}
          aria-pressed={value === lang}
          onClick={() => setLang(value)}
        >
          {label}
        </button>
      ))}
    </span>
  );
}
