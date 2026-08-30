/** Leading icon. Drawn inline rather than pulled from the mask-image icon
 *  set, because these two need to sit at the banner's own colour and never
 *  as a full-height square. */
function StarIcon() {
  return (
    <svg
      className="banner__icon"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2 15.09 8.26 22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" />
    </svg>
  );
}

function InviteIcon() {
  return (
    <svg
      className="banner__icon"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg
      className="banner__chevron"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function AnnouncementBanner({
  text,
  lead,
  href,
  onClick,
  variant = "notice",
  status = false,
}: {
  /** The call-to-action phrase — underlined, unless `status` says this isn't
   *  one right now. */
  text: string;
  /** Plain context that comes before `text`, read as one flowing sentence
   *  with it — not underlined, since the whole banner is one clickable
   *  region regardless and underlining all of it just reads as noisy. */
  lead?: string;
  href?: string;
  /** With `href`, runs before the link opens (used to copy the wallet
   *  address). On its own, makes the whole banner a button. */
  onClick?: () => void;
  /** "referral" swaps the amber tint for green and the star for the invite
   *  icon; everything else about the anatomy is identical. */
  variant?: "notice" | "referral";
  /** True while `text` reports what's happening ("Selling EURC...") rather
   *  than inviting a click ("Click here to sell..."). Same banner, same
   *  onClick (a click mid-swap still needs to no-op there, not here), just
   *  without the underline a plain status was never meant to carry. */
  status?: boolean;
}) {
  const className = variant === "referral" ? "banner banner--referral" : "banner";
  const actionable = Boolean(href || onClick);

  /* Three flex children, and only three: icon, text, chevron.
     The text used to live inside a wrapper span carrying `min-width: 0`,
     which let flex squeeze it below its natural width — so the line broke in
     two on a full-width desktop row with hundreds of pixels to spare. The
     wrapper is gone, the icon and chevron are `flex: none`, and the text
     takes the slack. `lead` and `text` stay in ONE span so they reflow as a
     single sentence: as separate flex items they'd wrap independently and
     land in two columns. */
  const content = (
    <span className="banner__text prose">
      {lead && `${lead} `}
      {status ? text : <span className="banner__cta">{text}</span>}
    </span>
  );

  const icon = variant === "referral" ? <InviteIcon /> : <StarIcon />;

  if (href) {
    // A real anchor so the whole box behaves like a link (middle-click, open
    // in a new tab); onClick only does the copy on its way out.
    return (
      <a href={href} target="_blank" rel="noreferrer" onClick={onClick} className={className}>
        {icon}
        {content}
        <Chevron />
      </a>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {icon}
        {content}
        <Chevron />
      </button>
    );
  }

  // Not clickable: no chevron, and nothing underlined — there's no action to
  // point at.
  return (
    <div className={className}>
      {icon}
      <span className="banner__text prose">
        {lead && `${lead} `}
        {text}
      </span>
    </div>
  );
}

export { Chevron };
